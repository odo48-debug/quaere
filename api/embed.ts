import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { createClerkClient, verifyToken } from '@clerk/backend';

// Removed Edge runtime as it conflicts with Clerk's crypto dependencies.
// Running as a standard Node.js serverless function.

const secretKey = process.env.CLERK_SECRET_KEY;
const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;

const clerkClient = createClerkClient({ secretKey, publishableKey });

export default async function handler(req: Request) {
    // 1. Method guard
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        // 2. Auth Check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response('Unauthorized: Missing Token', { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        let session;
        try {
            // Verify session token
            session = await verifyToken(token, { secretKey });
        } catch (e) {
            return new Response('Unauthorized: Invalid Token', { status: 401 });
        }

        // 3. Subscription Check (Pro)
        // Check if user has the PRO plan in metadata
        const user = await clerkClient.users.getUser(session.sub);
        const isPro = user.publicMetadata?.plan === 'pro';

        if (!isPro) {
            return new Response('Forbidden: Pro subscription required', { status: 403 });
        }

        const { text } = await req.json();

        if (!text) {
            return new Response('Missing text', { status: 400 });
        }

        // 4. Secret Key from environment 
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            return new Response('Server configuration error: Missing API Key', { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });

        // 5. Generate embedding on the server
        const result = await model.embedContent({
            content: { parts: [{ text }], role: "user" },
            taskType: TaskType.RETRIEVAL_DOCUMENT,
            // @ts-ignore
            outputDimensionality: 768,
        });

        const embedding = Array.from(result.embedding.values);

        // 6. Return the vector
        return new Response(JSON.stringify({ embedding }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error: any) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
