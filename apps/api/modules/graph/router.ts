import { Router } from 'express';
import {
    getGraphSummaryHandler,
    getGraphNodeDetailHandler,
    getGraphVisualization
} from './controller.js';

export const graphRouter = Router();

// Executive summary graph endpoint
graphRouter.get('/summary', getGraphSummaryHandler);

// Node detail risk inspection endpoint
graphRouter.get('/node/:id', getGraphNodeDetailHandler);

// Backward-compatible visualization endpoint
graphRouter.get('/visualize', getGraphVisualization);