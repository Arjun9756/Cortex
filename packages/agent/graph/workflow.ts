import { StateGraph, END, START } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { plannerNode } from "./nodes/planner.node.js";
import { answerNode } from "./nodes/answer.node.js";
import { routeNextTool } from "./edges.js";
import { evidenceNode } from "./nodes/evidence.node.js";
import { graphNode } from "./nodes/graph.node.js";
import { reflectionNode } from "./nodes/reflection.node.js";
import { vectorNode } from "./nodes/vector.node.js";
import { sqlNode } from "./nodes/sql.node.js";
import { clarifyNode } from './nodes/clarify.node.js';
import { knowledgeRiskNode } from "./nodes/knowledgeRisk.node.js";

const toolRoutes = {
    vectorNode: "vectorNode",
    graphNode: "graphNode",
    sqlNode: "sqlNode",
    knowledgeRiskNode: "knowledgeRiskNode",
    evidenceNode: "evidenceNode",
    clarifyNode: "clarifyNode",
} as const;

const workflow = new StateGraph(AgentState)
    .addNode("plannerNode", plannerNode)
    .addNode("evidenceNode", evidenceNode)
    .addNode("answerNode", answerNode)
    .addNode("reflectionNode", reflectionNode)
    .addNode("vectorNode", vectorNode)
    .addNode("graphNode", graphNode)
    .addNode("sqlNode", sqlNode)
    .addNode("clarifyNode", clarifyNode)
    .addNode("knowledgeRiskNode", knowledgeRiskNode)

    .addEdge(START, 'plannerNode')

    .addConditionalEdges('plannerNode', routeNextTool, toolRoutes)
    .addConditionalEdges('vectorNode', routeNextTool, toolRoutes)
    .addConditionalEdges('graphNode', routeNextTool, toolRoutes)
    .addConditionalEdges('sqlNode', routeNextTool, toolRoutes)
    .addConditionalEdges('knowledgeRiskNode', routeNextTool, toolRoutes)

    .addEdge('evidenceNode', 'reflectionNode')
    .addConditionalEdges('reflectionNode', (state) => state.pendingTools.length > 0 || state.clarificationQuestion ? routeNextTool(state) : 'answerNode', {
        ...toolRoutes,
        answerNode: 'answerNode',
    })
    .addEdge('clarifyNode', END)
    .addEdge('answerNode', END);

export const cortexAgent = workflow.compile();
