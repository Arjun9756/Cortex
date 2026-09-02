import { ContentEmbedding, GoogleGenAI } from "@google/genai";
import env from "../../../apps/api/config/env.js";

const genAI = new GoogleGenAI({apiKey:env.GEMINI_API_KEY!})
export async function generateEmbeddings(text: string) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return null;
    }
    try {
        const response = await genAI.models.embedContent({
            model: "gemini-embedding-2",
            contents: text.trim(),
            config: {
                outputDimensionality: 384 // 2092 Vector consume more RAM
            }
        })
        
        console.log('Generating Embedding')
        return response.embeddings?.[0]?.values
    }
    catch (error: any) {
        console.log(`Error While Generating Embedding From Gemini ${error?.message}`)
        return null
    }
}