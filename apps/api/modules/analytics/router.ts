import { Router } from 'express';
import { evaluatePullRequestRisk } from '../../../../packages/analytics/prRisk.service.js';
import { generateOffboardingHandoff } from '../../../../packages/analytics/offboarding.service.js';
import { executeTextToCypher } from '../../../../packages/graph/cypher/textToCypher.service.js';
import { generateAndSaveDailyReport, aggregateDailyReportData, renderDailyReportHtml } from '../../../../packages/analytics/dailyReport.service.js';
import sql from '../../config/postgres.js';
import { driver } from '../../config/neo4j.js';
import redis from '../../config/redis.js';
import { getTechnologiesHelper } from '../dashboard/controller.js';
import { getGraphTopologyMetrics } from '../graph/graphService.js';
import { DISPLAYABLE_SOURCES } from '../../../../packages/database/provenance.js';

export const analyticsRouter = Router();

// GET /api/analytics/trends - Real database metrics for Analytics page
analyticsRouter.get('/trends', async (req, res) => {
    try {
        const cacheKey = 'analytics:trends';
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return res.status(200).json(JSON.parse(cached));
            }
        } catch (cacheErr: any) {
            // Non-blocking Redis cache fallback
        }

        const now = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // 1. Commit and Activity Trends: 12-week continuous calendar from events table
        const weeklyEventsRaw = await sql`
            SELECT 
                date_trunc('week', created_at) AS week_start,
                count(*)::int AS total,
                COALESCE(SUM(
                    CASE 
                        WHEN (event_type ILIKE '%commit%' OR event_type ILIKE '%push%') THEN 
                            COALESCE(
                                CASE 
                                    WHEN jsonb_typeof(payload->'commits') = 'array' THEN jsonb_array_length(payload->'commits') 
                                    ELSE 1 
                                END, 
                                1
                            )
                        ELSE 0 
                    END
                ), 0)::int AS commits,
                COUNT(DISTINCT 
                    CASE 
                        WHEN (event_type ILIKE '%pull%' OR event_type ILIKE '%pr%') THEN 
                            COALESCE(payload->'pull_request'->>'id', payload->>'pr_id', id) 
                    END
                )::int AS prs,
                COUNT(DISTINCT 
                    CASE 
                        WHEN event_type ILIKE '%issue%' THEN 
                            COALESCE(payload->'issue'->>'id', id) 
                    END
                )::int AS issues
            FROM events
            WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} AND created_at >= NOW() - INTERVAL '12 weeks'
            GROUP BY 1
            ORDER BY week_start ASC
        `;

        // Map events by ISO week date string (YYYY-MM-DD)
        const eventWeekMap = new Map<string, { commits: number; prs: number; issues: number }>();
        for (const row of weeklyEventsRaw) {
            const d = new Date(row.week_start);
            const key = d.toISOString().split('T')[0] ?? '';
            eventWeekMap.set(key, {
                commits: Number(row.commits || 0),
                prs: Number(row.prs || 0),
                issues: Number(row.issues || 0),
            });
        }

        // Build 12 continuous week buckets up to the current week
        const commitTrends: Array<{ label: string; commits: number; prs: number; issues: number }> = [];
        for (let i = 11; i >= 0; i--) {
            const weekDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const dayOfWeek = weekDate.getDay();
            const diff = weekDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const monday = new Date(weekDate.setDate(diff));
            monday.setHours(0, 0, 0, 0);

            const key = monday.toISOString().split('T')[0] ?? '';
            const label = `${monthNames[monday.getMonth()]} ${monday.getDate()}`;

            let weekData = eventWeekMap.get(key);
            if (!weekData) {
                for (const [evtKey, val] of eventWeekMap.entries()) {
                    const evtTime = new Date(evtKey).getTime();
                    if (Math.abs(evtTime - monday.getTime()) < 4 * 24 * 60 * 60 * 1000) {
                        weekData = val;
                        break;
                    }
                }
            }

            commitTrends.push({
                label,
                commits: weekData?.commits || 0,
                prs: weekData?.prs || 0,
                issues: weekData?.issues || 0,
            });
        }

        // 2. Knowledge Graph Telemetry: Single Source of Truth from getGraphTopologyMetrics()
        const topo = await getGraphTopologyMetrics();
        const totalNodes = topo.totalNodes;
        const totalEdges = topo.totalEdges;

        // 3. Historical Graph Growth from daily_reports
        let graphGrowth: Array<{ label: string; nodes: number; edges: number }> = [];
        try {
            const reports = await sql`
                SELECT report_date, summary 
                FROM daily_reports
                WHERE source IN ${sql([...DISPLAYABLE_SOURCES])}
                ORDER BY report_date ASC 
                LIMIT 12
            `;
            if (reports && reports.length > 0) {
                graphGrowth = reports.map((r: any) => {
                    let s = r.summary;
                    if (typeof s === 'string') {
                        try { s = JSON.parse(s); } catch {}
                    }
                    const d = new Date(r.report_date);
                    const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;

                    let rNodes = Number(s?.graph?.nodeCount ?? s?.totalNodes ?? 0);
                    let rEdges = Number(s?.graph?.edgeCount ?? s?.totalEdges ?? 0);

                    if (rNodes === 0 && s?.workspace) {
                        const rCount = Number(s.workspace.repoCount || 0);
                        const pCount = Number(s.workspace.contributorCount || 0);
                        const tCount = Array.isArray(s.techStack) ? s.techStack.length : 0;
                        rNodes = rCount + pCount + tCount;
                        rEdges = Math.round(rNodes * 0.75);
                    }

                    if (rNodes === 0) rNodes = totalNodes;
                    if (rEdges === 0) rEdges = totalEdges;

                    return {
                        label,
                        nodes: rNodes,
                        edges: rEdges,
                    };
                });

                if (graphGrowth.length > 0) {
                    const last = graphGrowth[graphGrowth.length - 1];
                    if (last) {
                        last.nodes = totalNodes;
                        last.edges = totalEdges;
                    }
                }
            }
        } catch (repErr: any) {
            console.warn('[Analytics:Trends] Daily reports history query warning:', repErr?.message);
        }

        if (graphGrowth.length === 0 && totalNodes > 0) {
            graphGrowth = [{
                label: `${monthNames[now.getMonth()]} ${now.getDate()}`,
                nodes: totalNodes,
                edges: totalEdges
            }];
        }

        // 4. Repository Health from repo_metrics
        const repos = await sql`
            SELECT repo_name, bus_factor, risk_score, contributor_count, status
            FROM repo_metrics
            WHERE source IN ${sql([...DISPLAYABLE_SOURCES])}
            ORDER BY 
                CASE WHEN status = 'empty' THEN 1 ELSE 0 END ASC,
                risk_score DESC, 
                bus_factor ASC
        `;

        const repoHealth = (repos || []).map((r: any) => {
            const rawScore = Number(r.risk_score ?? 0);
            const status = r.status || (Number(r.contributor_count ?? 0) === 0 ? 'empty' : 'healthy');
            // Empty repositories have 0 risk and 0 bus factor; score is 0 with status='empty'
            const healthScore = status === 'empty' ? 0 : Math.max(0, Math.min(100, 100 - rawScore));
            const repoName = r.repo_name || r.name || 'Repository';
            return {
                name: repoName,
                repo_name: repoName,
                status,
                score: healthScore,
                busFactor: Number(r.bus_factor ?? 0),
                contributors: Number(r.contributor_count ?? 0),
                riskScore: rawScore,
            };
        });

        // 5. Technology Usage from technology_metrics
        const rawTech = await getTechnologiesHelper();
        const techUsage = (rawTech || []).slice(0, 10).map((t: any) => ({
            name: t.tech_name || t.technology_name || 'Tech',
            pct: Number(t.usage_percent || 0),
            contributors: Number(t.contributor_count ?? 0),
            repos: Number(t.repo_count ?? 0),
        }));

        // 6. Activity Heatmap from real events
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const numWeeks = 16;
        const heatmapCounts: number[][] = Array.from({ length: 7 }, () => Array(numWeeks).fill(0));

        try {
            const allEvents = await sql`
                SELECT created_at FROM events WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} AND created_at >= NOW() - INTERVAL '16 weeks'
            `;
            for (const ev of allEvents) {
                const evDate = new Date(ev.created_at);
                const dayIdx = evDate.getDay();
                const weeksAgo = Math.floor((now.getTime() - evDate.getTime()) / (7 * 86400 * 1000));
                const colIdx = numWeeks - 1 - weeksAgo;
                const heatmapRow = heatmapCounts[dayIdx];
                if (colIdx >= 0 && colIdx < numWeeks && heatmapRow) {
                    heatmapRow[colIdx] = (heatmapRow[colIdx] ?? 0) + 1;
                }
            }
        } catch (hmErr: any) {
            console.warn('[Analytics:Trends] Heatmap query warning:', hmErr?.message);
        }

        let maxHeatmapCount = 0;
        for (const row of heatmapCounts) {
            for (const count of row) {
                if (count > maxHeatmapCount) maxHeatmapCount = count;
            }
        }

        const heatmap = dayNames.map((day, dIdx) => {
            const row = heatmapCounts[dIdx] || [];
            const counts = row.map(c => {
                if (c <= 0) return 0;
                if (maxHeatmapCount <= 4) return c;
                return Math.min(4, Math.max(1, Math.ceil((c / maxHeatmapCount) * 4)));
            });
            return { day, counts };
        });

        // 7. Metadata summary
        const [totalEventsRes] = await sql`SELECT count(*)::int as count FROM events WHERE source IN ${sql([...DISPLAYABLE_SOURCES])}`;
        const totalEventsCount = Number(totalEventsRes?.count ?? 0);
        const activeReposCount = repoHealth.filter((r: any) => r.status !== 'empty').length;
        const emptyReposCount = repoHealth.filter((r: any) => r.status === 'empty').length;

        const metadata = {
            totalEvents: totalEventsCount,
            totalNodes,
            totalEdges,
            trackedRepos: repoHealth.length,
            activeRepos: activeReposCount,
            emptyRepos: emptyReposCount,
            trackedPeople: topo.personCount,
            trackedTechnologies: topo.techCount,
            source: 'PostgreSQL Precomputed Metrics & Live Events',
            isGraphDegraded: false,
            trackingDurationLabel: `Live data from ${activeReposCount} active repos (${emptyReposCount} empty), ${totalNodes} graph nodes, and ${totalEventsCount} events across GitHub, Slack & Jira.`,
        };

        const payload = {
            status: true,
            commitTrends,
            graphGrowth,
            repoHealth,
            techUsage,
            heatmap,
            metadata,
        };

        try {
            await redis.set(cacheKey, JSON.stringify(payload), 'EX', 45);
        } catch {}

        return res.status(200).json(payload);
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
                WHERE source IN ${sql([...DISPLAYABLE_SOURCES])}
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
        const result = await generateAndSaveDailyReport('webhook');
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
            WHERE source IN ${sql([...DISPLAYABLE_SOURCES])}
            ORDER BY report_date DESC
            LIMIT 30
        `;
        return res.status(200).json({ status: true, data: rows || [] });
    } catch (error: any) {
        return res.status(500).json({ status: false, error: error?.message });
    }
});

