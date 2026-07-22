import { Groq } from "groq-sdk/client.js";
import env from "../../../apps/api/config/env.js";

export const groq = new Groq({
    apiKey:env.GROQ_API_KEY,
    maxRetries:3,
})

export async function callLLMEntityExtract(prompt:string){
    try{
        const response = await groq.chat.completions.create({
            model:"moonshotai/kimi-k2-instruct",
            messages:[
                {role:"system" , content:"You are a strict JSON extraction engine. Always return valid JSON only, no markdown, no explanation."},
                {role:'user' , content:prompt}
            ],
            temperature:0,
            max_completion_tokens:2000,
            response_format:{type:"json_object"}
        })

        const content = response.choices[0]?.message?.content
        if(!content){
            throw new Error("Empty response from LLM")
        }

        return JSON.parse(content)
    }
    catch(error:any){
        console.error("LLM extraction failed:", {
            message: error?.message,
            status: error?.status,
        });

        // Rethrow so BullMQ worker can catch it and retry the job
        throw new Error(`Entity extraction failed: ${error?.message ?? "unknown error"}`);
    }
}