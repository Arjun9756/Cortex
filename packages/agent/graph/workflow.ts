import { StateGraph , END , START } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { plannerNode } from "./nodes/planner.node.js";
import { answerNode } from "./nodes/answer.node.js";
import { shouldContinue } from "./edges.js";
import { evidenceNode } from "./nodes/evidence.node.js";
import { graphNode } from "./nodes/graph.node.js";
import { reflectionNode } from "./nodes/reflection.node.js";
import { vectorNode } from "./nodes/vector.node.js";

const workflow = new StateGraph(AgentState)
    .addNode("planner" , plannerNode)
    .addNode("evidence" , evidenceNode)
    .addNode("answer" , answerNode)
    .addNode("reflection" , reflectionNode)
    .addNode('vector' , vectorNode)
    .addNode('graph' , graphNode)

    .addEdge(START , 'planner')
    .addEdge('planner' , "vector")
    .addEdge('vector' , 'graph')
    .addEdge('graph' , 'evidence')
    .addEdge('evidence' , 'reflection')
    .addConditionalEdges('reflection' , shouldContinue , {
        vector:"vector", // Loop Again
        answer:"answer" // Answer
    })
    .addEdge('answer' , 'answer')

export const cortexAgent = workflow.compile()