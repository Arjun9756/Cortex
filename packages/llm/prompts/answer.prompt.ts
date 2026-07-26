export function buildAnswerPrompt(query: string, evidence: string): string {
    return `
        You are Cortex, an engineering knowledge assistant. Answer the question using ONLY the evidence below. Cite the event/source. If evidence is insufficient, say so honestly.

        ${evidence}

        ## QUESTION:
        ${query}

        Answer concisely.
        `.trim();
}