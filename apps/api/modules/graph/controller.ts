import { Request, Response } from 'express';
import { buildGraphSummary, buildNodeDetail } from './graphService.js';
import {
    getGraphSummaryCache,
    setGraphSummaryCache,
    getGraphNodeCache,
    setGraphNodeCache,
} from './graphCache.js';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export async function getGraphSummaryHandler(req: Request, res: Response) {
    try {
        const { workspaceId,
              repository,
              personExternalId } = req.query;

        const rawLimit = parseInt((req.query.limit as string) ?? '', 10);
        const limit = isNaN(rawLimit) || rawLimit <= 0
            ? DEFAULT_LIMIT
            : Math.min(rawLimit, MAX_LIMIT);

        const filters: { workspaceId?: string; repository?: string; personExternalId?: string; limit: number } = { limit };
        if (typeof workspaceId === 'string' && workspaceId.trim()) filters.workspaceId = workspaceId.trim();
        if (typeof repository === 'string' && repository.trim()) filters.repository = repository.trim();
        if (typeof personExternalId === 'string' && personExternalId.trim()) filters.personExternalId = personExternalId.trim();

        const cached = await getGraphSummaryCache(filters.workspaceId, filters);
        if (cached) {
            return res.status(200).json({
                ...cached,
                cached: true
            });
        }

        const summary = await buildGraphSummary(filters);
        await setGraphSummaryCache(filters.workspaceId, filters, summary, 90);

        return res.status(200).json({
            ...summary,
            cached: false
        });
    } catch (error: any) {
        console.error('[Graph Summary Controller] Error:', error?.message);
        return res.status(500).json({ status: false, error: 'Failed to generate graph summary' });
    }
}

export async function getGraphNodeDetailHandler(req: Request, res: Response) {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : '';
        const type = (req.query.type as string) || '';

        if (!id || !id.trim()) {
            return res.status(400).json({ status: false, error: 'Node ID is required' });
        }

        const cleanId = id.trim();
        const cached = await getGraphNodeCache(type || 'auto', cleanId);
        if (cached) {
            return res.status(200).json({
                ...cached,
                cached: true
            });
        }

        const detail = await buildNodeDetail(cleanId, type);
        await setGraphNodeCache(type || detail.type || 'auto', cleanId, detail, 60);

        return res.status(200).json({
            ...detail,
            cached: false
        });
    } catch (error: any) {
        console.error('[Graph Node Detail Controller] Error:', error?.message);
        return res.status(500).json({ status: false, error: 'Failed to load node detail' });
    }
}

export async function getGraphVisualization(req: Request, res: Response) {
    return getGraphSummaryHandler(req, res);
}
