import { Router } from "express";
import { handleChatQuery } from "./controller.js";

export const chatRouter = Router()
chatRouter.post('/query' , handleChatQuery)