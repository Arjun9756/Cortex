import { Annotation } from "@langchain/langgraph";
export const AgentState = Annotation.Root({
    // User Query State
    query:Annotation<string>({
        default:()=> "",
        reducer:(prev , next)=>{
            return next
        }
    }),

    // Future Plan Scheduler
    plan:Annotation<string[]>({
        default:()=>[],
        reducer:(prev , next)=>{
            return next
        }
    }),

    // Qdrant Result
    vectorResult:Annotation<any[]>({
        default:()=>[],
        reducer:(prev , next)=>{
            return next
        }
    }),

    graphResult:Annotation<any[]>({
        default:()=>[],
        reducer:(prev , next)=>{
            return next
        }
    }),

    evidence:Annotation<string>({
        default:()=>"",
        reducer:(prev , next)=>{
            return next
        }
    }),

    needMoreSearch:Annotation<boolean>({
        default:()=>false,
        reducer:(prev,next)=>{
            return next
        }
    }),

    // Prevent Infinite AI Loop
    iterationCount: Annotation<number>({
        reducer: (_, next) => next,
        default: () => 0,
    }),

    // Final Answer
    answer: Annotation<string>({
        reducer: (_, next) => next,
        default: () => "",
    }),
})

export type AgentStateType = typeof AgentState.State