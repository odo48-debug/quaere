
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;


export async function generateEmbedding(text: string, token?: string): Promise<number[] | null> {
    console.log("[Embeddings] Generating for text:", text.substring(0, 30) + "...");

    try {
        // 1. Try to call our secure backend function first
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/embed', {
            method: 'POST',
            headers,
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            const data = await response.json();
            return data.embedding;
        }

        // 2. If the API doesn't exist (404) and we have a local key, fallback (useful for local dev)
        // This allows the app to stay "local-first" or "self-hostable" easily.
        if (response.status === 404 && API_KEY) {
            console.warn("[Embeddings] API not found, falling back to local Gemini call.");
            const model = genAI!.getGenerativeModel({ model: "gemini-embedding-2-preview" });
            const result = await model.embedContent({
                content: { parts: [{ text }], role: "user" },
                taskType: TaskType.RETRIEVAL_DOCUMENT,
                // @ts-ignore
                outputDimensionality: 768,
            });
            return Array.from(result.embedding.values);
        }

        console.error("[Embeddings] API Error:", response.status, await response.text());
        return null;
    } catch (error) {
        console.error("[Embeddings] Error generating embedding:", error);
        return null;
    }
}
