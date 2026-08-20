import sql from "../../apps/api/config/postgres.js";
import { driver } from "../../apps/api/config/neo4j.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createGroqChatCompletion, ANSWER_MODEL } from "../llm/providers/groq.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DailyReportData {
    reportDate: string;
    generatedAt: string;
    workspace: {
        healthScore: number;
        repoCount: number;
        contributorCount: number;
        avgRiskScore: number;
        avgBusFactor: number;
        openIssues: number;
        openPrs: number;
    };
    criticalRisks: {
        busFactorOneRepos: Array<{ name: string; busFactor: number; riskScore: number; contributors: number }>;
        highRiskPeople: Array<{ name: string; riskScore: number; role?: string; email?: string }>;
    };
    activitySummary: {
        commitsCount: number;
        prsCount: number;
        issuesCount: number;
        activeContributors: string[];
    };
    techStack: Array<{ name: string; usagePercent: number; contributors: number }>;
    aiRecommendations: string[];
}

/**
 * Ensures the daily_reports table exists in Postgres.
 */
export async function ensureDailyReportsTable() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS daily_reports (
                id SERIAL PRIMARY KEY,
                report_date DATE UNIQUE NOT NULL,
                html_content TEXT NOT NULL,
                summary JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `;
        await sql`
            CREATE INDEX IF NOT EXISTS daily_reports_date_idx ON daily_reports (report_date DESC)
        `;
    } catch (err: any) {
        console.warn('[DailyReport] ensureDailyReportsTable error:', err?.message);
    }
}

/**
 * Aggregates live metrics from Postgres, Neo4j, and recent events.
 */
export async function aggregateDailyReportData(): Promise<DailyReportData> {
    const todayStr = new Date().toISOString().slice(0, 10);
    const session = driver.session();

    try {
        // 1. Workspace & Person Stats
        const [personStats] = await sql`
            SELECT count(*)::int AS count, COALESCE(avg(risk_score), 45)::int AS avg_risk 
            FROM person_metrics
        `;
        const [repoStats] = await sql`
            SELECT count(*)::int AS count, COALESCE(avg(bus_factor), 1.0)::numeric AS avg_bf 
            FROM repo_metrics
        `;

        // 2. Repositories with Bus Factor = 1 (Critical)
        const bfOneRows = await sql`
            SELECT repo_name, bus_factor, risk_score, contributor_count 
            FROM repo_metrics 
            WHERE bus_factor <= 1 
            ORDER BY risk_score DESC, repo_name ASC
            LIMIT 10
        `;

        // 3. Top High-Risk People
        const highRiskPeopleRows = await sql`
            SELECT person_name, risk_score 
            FROM person_metrics 
            ORDER BY risk_score DESC 
            LIMIT 6
        `;

        // 4. Technology Usage
        const techRows = await sql`
            SELECT tech_name, usage_percent, contributor_count 
            FROM technology_metrics 
            ORDER BY usage_percent DESC 
            LIMIT 8
        `;

        // 5. Activity Events in last 24 hours (or all recent events if local seed)
        const [eventStat] = await sql`
            SELECT 
                count(*) FILTER (WHERE event_type ILIKE '%commit%' OR event_type ILIKE '%push%')::int AS commits,
                count(*) FILTER (WHERE event_type ILIKE '%pr%' OR event_type ILIKE '%pull%')::int AS prs,
                count(*) FILTER (WHERE event_type ILIKE '%issue%')::int AS issues
            FROM events
        `;

        // 6. Active contributors from Neo4j
        let activeContributors: string[] = [];
        try {
            const result = await session.run(`
                MATCH (p:PERSON)
                RETURN p.name AS name
                LIMIT 10
            `);
            activeContributors = result.records.map(r => r.get('name')).filter(Boolean);
        } catch (e: any) {
            console.warn('[DailyReport] Neo4j active contributors error:', e?.message);
        }

        const totalRepos = repoStats?.count ?? 15;
        const totalPeople = personStats?.count ?? 11;
        const avgRisk = personStats?.avg_risk ?? 42;
        const avgBf = Number(repoStats?.avg_bf ?? 1.1);
        const healthScore = Math.max(0, Math.min(100, Math.round(100 - (avgRisk * 0.7) - ((2 - Math.min(avgBf, 2)) * 15))));

        const busFactorOneRepos = (bfOneRows || []).map(r => ({
            name: r.repo_name,
            busFactor: Number(r.bus_factor ?? 1),
            riskScore: Number(r.risk_score ?? 80),
            contributors: Number(r.contributor_count ?? 1),
        }));

        const highRiskPeople = (highRiskPeopleRows || []).map(r => ({
            name: r.person_name,
            riskScore: Number(r.risk_score ?? 0),
        }));

        const techStack = (techRows || []).map(r => ({
            name: r.tech_name,
            usagePercent: Number(r.usage_percent ?? 0),
            contributors: Number(r.contributor_count ?? 1),
        }));

        // Generate dynamic AI Recommendations based on the actual risks
        const aiRecommendations = generateRecommendations(busFactorOneRepos, highRiskPeople, healthScore);

        return {
            reportDate: todayStr,
            generatedAt: new Date().toUTCString(),
            workspace: {
                healthScore,
                repoCount: totalRepos,
                contributorCount: totalPeople,
                avgRiskScore: avgRisk,
                avgBusFactor: avgBf,
                openIssues: eventStat?.issues ?? 0,
                openPrs: eventStat?.prs ?? 0,
            },
            criticalRisks: {
                busFactorOneRepos,
                highRiskPeople,
            },
            activitySummary: {
                commitsCount: eventStat?.commits ?? 0,
                prsCount: eventStat?.prs ?? 0,
                issuesCount: eventStat?.issues ?? 0,
                activeContributors,
            },
            techStack,
            aiRecommendations,
        };
    } finally {
        await session.close();
    }
}

/**
 * Generates rule-based / contextual executive recommendations for the report.
 */
function generateRecommendations(
    bfOneRepos: Array<{ name: string; busFactor: number }>,
    highRiskPeople: Array<{ name: string; riskScore: number }>,
    healthScore: number
): string[] {
    const recommendations: string[] = [];

    if (bfOneRepos.length > 0) {
        const topRepo = bfOneRepos[0]?.name || 'Core Repository';
        recommendations.push(
            `<strong>Distribute Critical Repository Ownership:</strong> <code>${topRepo}</code> is currently operating with a Bus Factor of 1. Assign a designated co-owner to review upcoming PRs and cross-train team members.`
        );
    }

    if (highRiskPeople.length > 0) {
        const topPerson = highRiskPeople[0]?.name || 'Primary Maintainer';
        recommendations.push(
            `<strong>Knowledge Offboarding Preparedness:</strong> <strong>${topPerson}</strong> holds the highest departure risk concentration. Schedule an architectural knowledge-transfer session to document sole-maintained submodules.`
        );
    }

    recommendations.push(
        `<strong>Modernization & Migration Validation:</strong> Ensure all recent infrastructure migrations (such as Valkey driver replacements and Temporal sagas) have automated end-to-end integration tests in CI/CD pipelines.`
    );

    if (healthScore < 70) {
        recommendations.push(
            `<strong>Overall System Health:</strong> Workspace health is currently at ${healthScore}%. Prioritize documentation debt reduction and pair-programming across single-point-of-failure microservices.`
        );
    } else {
        recommendations.push(
            `<strong>Health Trajectory:</strong> Workspace engineering health is strong at ${healthScore}%. Maintain current deployment velocity while enforcing multi-reviewer pull request standards.`
        );
    }

    return recommendations;
}

function getCortexLogoBase64(): string {
    try {
        const logoPath = path.join(__dirname, '..', '..', 'web', 'public', 'cortex-logo.png');
        if (fs.existsSync(logoPath)) {
            const buf = fs.readFileSync(logoPath);
            return `data:image/png;base64,${buf.toString('base64')}`;
        }
    } catch (e: any) {
        console.warn('[DailyReport] Logo load notice:', e?.message);
    }
    return '';
}

/**
 * Builds the standalone, high-aesthetic executive HTML email/report.
 */
export function renderDailyReportHtml(data: DailyReportData): string {
    const healthBadgeColor = data.workspace.healthScore >= 75 ? '#10b981' : data.workspace.healthScore >= 50 ? '#f59e0b' : '#ef4444';
    const logoBase64 = getCortexLogoBase64();

    const logoHtml = logoBase64
        ? `<img src="${logoBase64}" width="34" height="34" style="border-radius: 8px; vertical-align: middle; box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);" alt="Cortex Logo" />`
        : `<span style="font-size: 24px; vertical-align: middle;">🧠</span>`;

    const repoRows = data.criticalRisks.busFactorOneRepos.map(r => `
        <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #27272a; font-family: monospace; font-size: 13px; color: #38bdf8;">${r.name}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #27272a; text-align: center;">
                <span style="background: rgba(239, 68, 68, 0.15); color: #f87171; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 12px;">BF = ${r.busFactor}</span>
            </td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #27272a; text-align: center; color: #fbbf24; font-weight: 600; font-size: 13px;">${r.riskScore}%</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #27272a; text-align: right; color: #a1a1aa; font-size: 13px;">${r.contributors} dev</td>
        </tr>
    `).join('');

    const personRows = data.criticalRisks.highRiskPeople.map(p => `
        <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #27272a; color: #f4f4f5; font-weight: 600; font-size: 13px;">👤 ${p.name}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #27272a; text-align: right;">
                <span style="background: rgba(251, 191, 36, 0.15); color: #fbbf24; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${p.riskScore}% Risk</span>
            </td>
        </tr>
    `).join('');

    const techBadges = data.techStack.map(t => `
        <span style="display: inline-block; background: #18181b; border: 1px solid #27272a; border-radius: 6px; padding: 6px 12px; margin: 4px; font-size: 12px; color: #e4e4e7;">
            <strong>${t.name}</strong> <span style="color: #6366f1; margin-left: 4px;">(${t.usagePercent}%)</span>
        </span>
    `).join('');

    const recommendationItems = data.aiRecommendations.map((rec, idx) => `
        <li style="margin-bottom: 10px; color: #d4d4d8; font-size: 13px; line-height: 1.6;">
            ${rec}
        </li>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cortex Daily Engineering Pulse — ${data.reportDate}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5; }
        .container { max-width: 720px; margin: 0 auto; padding: 24px 16px; }
        .card { background-color: #121215; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
        .stat-grid { display: table; width: 100%; border-collapse: separate; border-spacing: 10px; margin-top: 10px; }
        .stat-box { display: table-cell; width: 25%; background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 14px; text-align: center; vertical-align: middle; }
        .stat-val { font-size: 22px; font-weight: 800; color: #fafafa; margin-bottom: 4px; }
        .stat-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { text-align: left; padding: 8px 14px; font-size: 11px; text-transform: uppercase; color: #71717a; letter-spacing: 0.5px; border-bottom: 2px solid #27272a; }
        .badge-health { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header with Cortex Brand Logo -->
        <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #27272a;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px;">
                ${logoHtml}
                <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; vertical-align: middle;">CORTEX</span>
                <span style="background: #312e81; color: #a5b4fc; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: middle;">Executive Daily Pulse</span>
            </div>
            <div style="font-size: 13px; color: #a1a1aa;">
                Engineering Digest for <strong>${data.reportDate}</strong> &bull; Generated at ${data.generatedAt}
            </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="card" style="border-top: 4px solid #6366f1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #f4f4f5;">📊 Workspace Health & Velocity</h3>
                <span class="badge-health" style="background: rgba(${data.workspace.healthScore >= 75 ? '16, 185, 129' : '245, 158, 11'}, 0.15); color: ${healthBadgeColor}; border: 1px solid ${healthBadgeColor};">
                    Health: ${data.workspace.healthScore}/100
                </span>
            </div>
            <div class="stat-grid">
                <div class="stat-box">
                    <div class="stat-val" style="color: #60a5fa;">${data.workspace.repoCount}</div>
                    <div class="stat-lbl">Active Repos</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val" style="color: #a78bfa;">${data.workspace.contributorCount}</div>
                    <div class="stat-lbl">Contributors</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val" style="color: #fbbf24;">${data.workspace.avgRiskScore}%</div>
                    <div class="stat-lbl">Avg Departure Risk</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val" style="color: #f87171;">${data.criticalRisks.busFactorOneRepos.length}</div>
                    <div class="stat-lbl">Bus Factor = 1 Repos</div>
                </div>
            </div>
        </div>

        <!-- Critical Bus Factor Risks -->
        <div class="card">
            <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #ef4444; display: flex; align-items: center; gap: 6px;">
                <span>⚠️</span> Single-Point-of-Failure Repositories (Bus Factor &le; 1)
            </h3>
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #a1a1aa;">
                Repositories where over 50% of the codebase is maintained by a single engineer.
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Repository</th>
                        <th style="text-align: center;">Bus Factor</th>
                        <th style="text-align: center;">Risk Score</th>
                        <th style="text-align: right;">Contributors</th>
                    </tr>
                </thead>
                <tbody>
                    ${repoRows}
                </tbody>
            </table>
        </div>

        <!-- Departure Risk Concentration -->
        <div class="card">
            <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #f59e0b; display: flex; align-items: center; gap: 6px;">
                <span>⚡</span> Top Departure Knowledge Concentrations
            </h3>
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #a1a1aa;">
                Engineers with highest concentration of unshared domain knowledge and sole commits.
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Engineer</th>
                        <th style="text-align: right;">Calculated Risk Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${personRows}
                </tbody>
            </table>
        </div>

        <!-- Technology Footprint -->
        <div class="card">
            <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #818cf8; display: flex; align-items: center; gap: 6px;">
                <span>🛠️</span> Active Technology Footprint
            </h3>
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #a1a1aa;">
                Most widely utilized technologies across microservices and data pipelines.
            </p>
            <div style="line-height: 1.8;">
                ${techBadges}
            </div>
        </div>

        <!-- AI Executive Takeaways -->
        <div class="card" style="background: linear-gradient(135deg, rgba(49, 46, 129, 0.3) 0%, rgba(18, 18, 21, 1) 100%); border-color: #4338ca;">
            <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #c7d2fe; display: flex; align-items: center; gap: 6px;">
                <span>💡</span> AI Recommended Actions for Today
            </h3>
            <ul style="margin: 0; padding-left: 20px;">
                ${recommendationItems}
            </ul>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #18181b; font-size: 11px; color: #52525b;">
            <p style="margin: 0 0 4px 0;">This report is automatically compiled by the <strong>Cortex Agentic Knowledge Graph Engine</strong>.</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Cortex Intelligence Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generates and stores the daily report in PostgreSQL (pure DB storage, no filesystem files).
 */
export async function generateAndSaveDailyReport(): Promise<{ reportDate: string; summary: DailyReportData; html: string }> {
    console.log('[DailyReport] Starting daily report generation...');
    await ensureDailyReportsTable();

    const data = await aggregateDailyReportData();
    const html = renderDailyReportHtml(data);

    // Save exclusively to PostgreSQL daily_reports table
    try {
        await sql`
            INSERT INTO daily_reports (report_date, html_content, summary, created_at)
            VALUES (${data.reportDate}, ${html}, ${JSON.stringify(data)}, NOW())
            ON CONFLICT (report_date)
            DO UPDATE SET
                html_content = EXCLUDED.html_content,
                summary = EXCLUDED.summary,
                created_at = EXCLUDED.created_at
        `;
        console.log(`[DailyReport] Upserted daily report for ${data.reportDate} in PostgreSQL.`);
    } catch (dbErr: any) {
        console.warn(`[DailyReport] Failed to save in PostgreSQL table: ${dbErr?.message}`);
    }

    return {
        reportDate: data.reportDate,
        summary: data,
        html,
    };
}

