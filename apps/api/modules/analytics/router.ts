import { Router } from 'express';
import { evaluatePullRequestRisk } from '../../../../packages/analytics/prRisk.service.js';
import { generateOffboardingHandoff } from '../../../../packages/analytics/offboarding.service.js';
import { executeTextToCypher } from '../../../../packages/graph/cypher/textToCypher.service.js';

export const analyticsRouter = Router();

// GET /api/analytics/pr-risk?repo=Cortex&prId=42&author=Arjun%20Kumar&files=packages/agent/graph/workflow.ts
analyticsRouter.get('/pr-risk', async (req, res) => {
    try {
        const repository = (req.query.repo as string) || 'Cortex';
        const prId = (req.query.prId as string) || '1';
        const author = (req.query.author as string) || 'Arjun Kumar';
        const filesParam = req.query.files as string;
        const modifiedFiles = filesParam ? filesParam.split(',').map(f => f.trim()) : [];

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

// GET /api/analytics/offboarding?person=Arjun%20Kumar
analyticsRouter.get('/offboarding', async (req, res) => {
    try {
        const personName = (req.query.person as string) || 'Arjun Kumar';
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
