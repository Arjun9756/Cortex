import { StateGraph , END , START } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { plannerNode } from "./nodes/planner.node.js";
import { answerNode } from "./nodes/answer.node.js";
import { routeNextTool } from "./edges.js";
import { evidenceNode } from "./nodes/evidence.node.js";
import { graphNode } from "./nodes/graph.node.js";
import { reflectionNode } from "./nodes/reflection.node.js";
import { vectorNode } from "./nodes/vector.node.js";
import { sqlNode } from "./nodes/sql.node.js";
import { clarifyNode } from './nodes/clarify.node.js'

const workflow = new StateGraph(AgentState)
    .addNode("plannerNode" , plannerNode)
    .addNode("evidenceNode" , evidenceNode)
    .addNode("answerNode" , answerNode)
    .addNode("reflectionNode" , reflectionNode)
    .addNode('vectorNode' , vectorNode)
    .addNode('graphNode' , graphNode)
    .addNode('sqlNode' , sqlNode)
    .addNode('clarifyNode', clarifyNode)

    .addEdge(START , 'plannerNode')

    // Planner Node
    .addConditionalEdges('plannerNode' , routeNextTool , {
        vectorNode: "vectorNode",
        graphNode: "graphNode",
        sqlNode: "sqlNode",
        evidenceNode: 'evidenceNode',
        clarifyNode: 'clarifyNode',
    })

    .addConditionalEdges('vectorNode', routeNextTool, { vectorNode: 'vectorNode', graphNode: 'graphNode', sqlNode: 'sqlNode', evidenceNode: 'evidenceNode', clarifyNode: 'clarifyNode' })
    .addConditionalEdges('graphNode', routeNextTool, { vectorNode: 'vectorNode', graphNode: 'graphNode', sqlNode: 'sqlNode', evidenceNode: 'evidenceNode', clarifyNode: 'clarifyNode' })
    .addConditionalEdges('sqlNode', routeNextTool, { vectorNode: 'vectorNode', graphNode: 'graphNode', sqlNode: 'sqlNode', evidenceNode: 'evidenceNode', clarifyNode: 'clarifyNode' })
    .addEdge('evidenceNode' , 'reflectionNode')
    .addConditionalEdges('reflectionNode', (state) => state.pendingTools.length > 0 || state.clarificationQuestion ? routeNextTool(state) : 'answerNode', {
        vectorNode: 'vectorNode', graphNode: 'graphNode', sqlNode: 'sqlNode', evidenceNode: 'evidenceNode', clarifyNode: 'clarifyNode', answerNode: 'answerNode',
    })
    .addEdge('clarifyNode', END)
    .addEdge('answerNode' , END)

export const cortexAgent = workflow.compile()
