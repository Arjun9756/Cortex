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

    pendingTools: Annotation<string[]>({
        default: () => [],
        reducer: (_, next) => next,
    }),

    executedTools: Annotation<string[]>({
        default: () => [],
        reducer: (_, next) => next,
    }),

    clarificationQuestion: Annotation<string>({
        default: () => "",
        reducer: (_, next) => next,
    }),

    entities: Annotation<string[]>({
        default: () => [],
        reducer: (_, next) => next,
    }),

    graphAction: Annotation<string>({
        default: () => 'describeEntity',
        reducer: (_, next) => next,
    }),

    graphTarget: Annotation<string>({
        default: () => '',
        reducer: (_, next) => next,
    }),

    graphRelation: Annotation<string>({
        default: () => '',
        reducer: (_, next) => next,
    }),

    vectorQuery: Annotation<string>({
        default: () => '',
        reducer: (_, next) => next,
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
        reducer: (current, next) => next ?? current,
        default: () => 0,
    }),

    // Final Answer
    answer: Annotation<string>({
        reducer: (_, next) => next,
        default: () => "",
    }),

    sqlResult:Annotation<any[]>({
        reducer:(_ , next)=>next,
        default:()=>[]
    }),

    webQuery:Annotation<string>({
        reducer:(_, next)=>next,
        default:()=>''
    }),

    WebQueryResult:Annotation<any[]>({
        reducer:(_,next)=>next,
        default:()=>[]
    }),

    knowledgeRiskResult: Annotation<any>({
        reducer: (_, next) => next,
        default: () => null,
    })
})

export type AgentStateType = typeof AgentState.State
