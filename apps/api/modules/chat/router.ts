import { Router } from "express";
import { handleChatQuery } from "./controller.js";

export const chatCouter = Router()
chatCouter.post('/query' , handleChatQuery)