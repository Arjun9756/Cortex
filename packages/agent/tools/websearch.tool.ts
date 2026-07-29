import { tavily } from "@tavily/core";
import env from "../../../apps/api/config/env.js";
import { AgentStateType } from "../graph/state.js";

export const tvly = tavily({ apiKey: env.TAVILY_API_KEY! })

export async function webSearch(state: AgentStateType , limit?:number): Promise<Partial<AgentStateType>> {
    const pendingTools = state.pendingTools.filter((tool) => tool !== 'web_search')
    const executedTools = [...new Set([...state.executedTools, 'web_search'])]

    try {
        const response = await tvly.search(state.webQuery, {
            maxResults: limit || 2,
            includeAnswer: true,
        })

        const answer = response.answer
        const sources = response.results.map((item) => {
            return { title: item.title, url: item.url, content: item.content }
        })

        return { WebQueryResult: [{ answer, sources }], pendingTools, executedTools }
    }
    catch (error: any) {
        console.log(`Error While Making Web Search ${error.response}`)
        return { WebQueryResult: [], pendingTools, executedTools }
    }
}