import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Narrow, app-specific operation: powers the in-app support chatbot.
// The conversation history and system prompt live server-side so the prompt
// is not exposed and integration credits are billed to the app (service role).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Cap conversation history to limit token / credit usage
    const recent = messages.slice(-12);

    let prompt = `You are an AI support assistant for a fitness portal called RepsAndSteps. You are helpful, friendly, and knowledgeable about fitness, workouts, nutrition, and using this app. Please provide a helpful and concise answer.

Here is the conversation history:
`;
    for (const msg of recent) {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      const content = String(msg.content ?? '').slice(0, 2000);
      prompt += `${role}: ${content}\n`;
    }
    prompt += `Assistant:`;

    const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
    });

    return Response.json({ reply: typeof reply === 'string' ? reply : JSON.stringify(reply) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}