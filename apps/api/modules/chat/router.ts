import { Router } from "express";
import { handleChatQuery, handleChatQueryStream } from "./controller.js";

export const chatRouter = Router();
chatRouter.post('/query', handleChatQuery);
chatRouter.post('/stream', handleChatQueryStream);