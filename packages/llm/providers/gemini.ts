import { ContentEmbedding, GoogleGenAI } from "@google/genai";
import env from "../../../apps/api/config/env.js";

const genAI = new GoogleGenAI({apiKey:env.GEMINI_API_KEY!})
export async function generateEmbeddings(text:string){
    try{
        const response = await genAI.models.embedContent({
            model:"gemini-embedding-2",
            contents:text
        })
        
        return response.embeddings?.[0]?.values
    }
    catch(error:any){
        console.log(`Error While Generating Embedding From Gemini ${error?.message}`)
        return null
    }
}