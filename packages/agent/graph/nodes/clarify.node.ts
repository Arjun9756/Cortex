import { AgentStateType } from '../state.js'

export function clarifyNode(state: AgentStateType): Partial<AgentStateType> {
    return {
        answer: state.clarificationQuestion || 'Could you share a little more detail so I can look this up?',
    }
}
