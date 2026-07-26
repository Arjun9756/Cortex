import { AgentStateType } from "./state.js";
export function shouldContinue(state:AgentStateType):"vector" | "answer"{
    return (state.needMoreSearch && state.iterationCount < 2) ? "vector" : "answer"
}