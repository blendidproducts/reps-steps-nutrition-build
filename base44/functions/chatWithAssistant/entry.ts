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

    // Per-user rate limit. Every call spends the app's LLM integration credits,
    // so cap how often a single account can trigger it. The counters are
    // server-managed (admin-only write), so a user can't reset their own limit.
    const CHAT_LIMIT = 30;
    const CHAT_WINDOW_MS = 60 * 60 * 1000;
    const now = Date.now();
    const windowStart = user.chat_window_start ? Date.parse(user.chat_window_start) : 0;
    const inWindow = Number.isFinite(windowStart) && now - windowStart < CHAT_WINDOW_MS;
    const used = inWindow ? Number(user.chat_rate_count) || 0 : 0;
    if (used >= CHAT_LIMIT) {
      return Response.json({ error: 'Too many messages. Please try again later.' }, { status: 429 });
    }
    await base44.asServiceRole.entities.User.update(user.id, {
      chat_rate_count: used + 1,
      chat_window_start: new Date(inWindow ? windowStart : now).toISOString(),
    });

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