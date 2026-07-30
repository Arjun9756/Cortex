import sql from '../../config/postgres.js'
import { Request , Response } from 'express';

export async function getDashboardOverview(req: Request, res: Response) {
    const [workspace] = await sql`SELECT * FROM workspace_metrics ORDER BY computed_at DESC LIMIT 1`;
    const repos = await sql`SELECT * FROM repo_metrics ORDER BY risk_score DESC LIMIT 4`;
    const people = await sql`SELECT * FROM person_metrics ORDER BY risk_score DESC LIMIT 4`;
    res.json({ workspace, repos, people });
}

export async function getPeoplePage(req: Request, res: Response) {
    const people = await sql`SELECT * FROM person_metrics ORDER BY risk_score DESC`;
    res.json({ people });
}

export async function getBusFactorPage(req: Request, res: Response) {
    const repos = await sql`SELECT * FROM repo_metrics ORDER BY bus_factor ASC`;
    res.json({ repos });
}

export async function getTechnologiesPage(req: Request, res: Response) {
    const tech = await sql`SELECT * FROM technology_metrics ORDER BY usage_percent DESC`;
    res.json({ technologies: tech });
}

export async function getTimeline(req: Request, res: Response) {
    const events = await sql`
        SELECT id, provider, event_type, payload, created_at 
        FROM events 
        ORDER BY created_at DESC 
        LIMIT 10
    `;
    res.json({ events }); // frontend format karega — commit/PR/Slack/Jira icons ke saath
}