import { Router } from 'express';
import { evaluatePullRequestRisk } from '../../../../packages/analytics/prRisk.service.js';
import { generateOffboardingHandoff } from '../../../../packages/analytics/offboarding.service.js';
import { executeTextToCypher } from '../../../../packages/graph/cypher/textToCypher.service.js';
import { generateAndSaveDailyReport, aggregateDailyReportData, renderDailyReportHtml } from '../../../../packages/analytics/dailyReport.service.js';
import sql from '../../config/postgres.js';
import { driver } from '../../config/neo4j.js';
import { getTechnologiesHelper } from '../dashboard/controller.js';

export const analyticsRouter = Router();

// GET /api/analytics/trends - Real database metrics for Analytics page
analyticsRouter.get('/trends', async (req, res) => {
    try {
        // 1. Commit, PR & Issue Trends from events table
        const weeklyEvents = await sql`
            SELECT 
                date_trunc('week', created_at) AS week_start,
                count(*)::int AS total,
                count(*) FILTER (WHERE event_type ILIKE '%commit%' OR event_type ILIKE '%push%')::int AS commits,
                count(*) FILTER (WHERE event_type ILIKE '%pull%' OR event_type ILIKE '%pr%')::int AS prs,
                count(*) FILTER (WHERE event_type ILIKE '%issue%')::int AS issues
            FROM events
            WHERE created_at >= NOW() - INTERVAL '12 weeks'
            GROUP BY 1
            ORDER BY week_start ASC
        `;

        let commitTrends: Array<{ label: string; commits: number; prs: number; issues: number }> = [];
        if (weeklyEvents && weeklyEvents.length > 0) {
            commitTrends = weeklyEvents.map((row: any, idx: number) => {
                const d = new Date(row.week_start);
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;
                return {
                    label,
                    commits: Number(row.commits || 0),
                    prs: Number(row.prs || 0),
                    issues: Number(row.issues || 0),
                };
            });
        }

        // 2. Knowledge Graph Metrics from Neo4j
        const session = driver.session();
        let totalNodes = 0;
        let totalEdges = 0;
        let graphGrowth: Array<{ label: string; nodes: number; edges: number }> = [];
        
        try {
            const nr = await session.run(`MATCH (n) RETURN count(n) AS nodeCount`);
            const er = await session.run(`MATCH ()-[r]->() RETURN count(r) AS edgeCount`);
            totalNodes = nr.records[0]?.get('nodeCount')?.toNumber() ?? 0;
            totalEdges = er.records[0]?.get('edgeCount')?.toNumber() ?? 0;
        } catch (neoErr: any) {
            console.warn('[Analytics:Trends] Neo4j fetch warning:', neoErr?.message);
            return res.status(503).json({ status: 'unavailable', error: 'Knowledge graph is unavailable. No analytics data was fabricated.' });
        } finally {
            await session.close();
        }

        // 3. Repository Health from repo_metrics table
        const repos = await sql`
            SELECT repo_name, bus_factor, risk_score, contributor_count, status
            FROM repo_metrics
            ORDER BY risk_score ASC, bus_factor DESC
        `;

        const repoHealth = (repos || []).map((r: any) => ({
            name: r.repo_name,
            score: Math.max(0, 100 - (Number(r.risk_score) || 0)), // Health Score = 100 - risk_score
            busFactor: Number(r.bus_factor ?? 1),
            contributors: Number(r.contributor_count ?? 1),
            riskScore: Number(r.risk_score ?? 0),
        }));

        // 4. Technology Usage from technology_metrics table
        const rawTech = await getTechnologiesHelper();
        const techUsage = (rawTech || []).slice(0, 10).map((t: any) => ({
            name: t.tech_name || t.technology_name || 'Tech',
            pct: Number(t.usage_percent || 0),
            contributors: Number(t.contributor_count ?? 1),
        }));

        // Historical heatmap data is not persisted. Return an honest empty state.
        const heatmap: Array<{ day: string; counts: number[] }> = [];

        // 6. Metadata summary
        const totalEventsRes = await sql`SELECT count(*)::int as count FROM events`;
        const totalPeopleRes = await sql`SELECT count(*)::int as count FROM person_metrics`;

        const totalEventsCount = Number(totalEventsRes[0]?.count ?? 0);
        const totalPeopleCount = Number(totalPeopleRes[0]?.count ?? 0);

        const metadata = {
            totalEvents: totalEventsCount,
            totalNodes,
            totalEdges,
            trackedRepos: repoHealth.length,
            trackedPeople: totalPeopleCount,
            trackingDurationLabel: `Live data from ${repoHealth.length} repos, ${totalNodes} graph nodes, and ${totalEventsCount} events across GitHub, Slack & Jira.`,
        };

        return res.status(200).json({
            status: true,
            commitTrends,
            graphGrowth,
            repoHealth,
            techUsage,
            heatmap,
            metadata,
        });
    } catch (error: any) {
        console.error('[Analytics:Trends] Error:', error);
        return res.status(500).json({ status: false, error: error?.message || 'Failed to fetch analytics trends' });
    }
});

// GET /api/analytics/pr-risk?repo=my-repo&prId=42&author=Jane%20Doe&files=src/index.ts
analyticsRouter.get('/pr-risk', async (req, res) => {
    try {
        const repository = req.query.repo as string;
        const prId = (req.query.prId as string) || '1';
        const author = req.query.author as string;
        const filesParam = req.query.files as string;
        const modifiedFiles = filesParam ? filesParam.split(',').map(f => f.trim()) : [];

        if (!repository || !author) {
            return res.status(400).json({ status: false, error: 'Parameters "repo" and "author" are required' });
        }

        const risk = await evaluatePullRequestRisk({
            repository,
            prId,
            author,
            modifiedFiles,
        });

        return res.status(200).json({ status: true, data: risk });
    } catch (error: any) {
        return res.status(500).json({ status: false, error: error?.message });
    }
});

// GET /api/analytics/offboarding?person=Jane%20Doe
analyticsRouter.get('/offboarding', async (req, res) => {
    try {
        const personName = req.query.person as string;
        if (!personName) {
            return res.status(400).json({ status: false, error: 'Parameter "person" is required' });
        }
        const handoff = await generateOffboardingHandoff(personName);
        return res.status(200).json({ status: true, data: handoff });
    } catch (error: any) {
        return res.status(500).json({ status: false, error: error?.message });
    }
});

// POST /api/analytics/cypher { "query": "MATCH (n:PERSON) RETURN n.name" }
analyticsRouter.post('/cypher', async (req, res) => {
    try {
        const { query } = req.body;
        const result = await executeTextToCypher(query);
        return res.status(result.isValid ? 200 : 400).json({ status: result.isValid, ...result });
    } catch (error: any) {
        return res.status(500).json({ status: false, error: error?.message });
    }
});

// GET /api/analytics/daily-report/latest - Returns or renders the latest daily HTML report
analyticsRouter.get('/daily-report/latest', async (req, res) => {
    try {
        const format = (req.query.format as string) || (req.headers.accept?.includes('text/html') ? 'html' : 'json');

        // Look for the latest report in PostgreSQL
        let reportRow = null;
        try {
            const rows = await sql`
                SELECT report_date, html_content, summary, created_at 
                FROM daily_reports 
                ORDER BY report_date DESC 
                LIMIT 1
            `;
            if (rows && rows.length > 0) reportRow = rows[0];
        } catch (e: any) {
            console.warn('[Analytics:DailyReport] PostgreSQL query fallback:', e?.message);
        }

        // If no report in DB yet, generate on the fly
        if (!reportRow) {
            const data = await aggregateDailyReportData();
            const html = renderDailyReportHtml(data);
            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(html);
            }
            return res.status(200).json({
                status: true,
                reportDate: data.reportDate,
                summary: data,
                html,
            });
        }

        if (format === 'html') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(reportRow.html_content);
        }

        return res.status(200).json({
            status: true,
            reportDate: reportRow.report_date,
            createdAt: reportRow.created_at,
            summary: reportRow.summary,
            html: reportRow.html_content,
        });
    } catch (error: any) {
        return res.status(500).json({ status: false, error: error?.message });
    }
});

// POST /api/analytics/daily-report/generate - Manually triggers a fresh 24h daily report generation
analyticsRouter.post('/daily-report/generate', async (req, res) => {
    try {
        const result = await generateAndSaveDailyReport();
        return res.status(200).json({
            status: true,
            message: `Daily report for ${result.reportDate} successfully generated and stored in PostgreSQL.`,
            reportDate: result.reportDate,
            summary: result.summary,
        });
    } catch (error: any) {
        return res.status(500).json({ status: false, error: error?.message });
    }
});

// GET /api/analytics/daily-report/history - Returns list of past generated daily reports
analyticsRouter.get('/daily-report/history', async (req, res) => {
    try {
        const rows = await sql`
            SELECT id, report_date, created_at, (summary->'workspace'->>'healthScore')::int AS health_score,
                   (summary->'criticalRisks'->'busFactorOneRepos') AS bus_factor_repos
            FROM daily_reports
            ORDER BY report_date DESC
            LIMIT 30
        `;
        return res.status(200).json({ status: true, data: rows || [] });
    } catch (error: any) {
        return res.status(500).json({ status: false, error: error?.message });
    }
});

