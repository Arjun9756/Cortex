import { Router } from 'express'
import { getGraphVisualization } from './controller.js'

export const graphRouter = Router()

graphRouter.get('/visualize', getGraphVisualization)
