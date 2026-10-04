import { Router } from "express";
import { handleChatQuery, handleChatQueryStream } from "./controller.js";

export const chatRouter = Router();
chatRouter.post('/', handleChatQuery);
chatRouter.post('/query', handleChatQuery);
chatRouter.post('/stream', handleChatQueryStream);
chatRouter.get('/', (req, res) => res.status(200).json({ status: true, message: 'Cortex Chat Agent API is active.' }));