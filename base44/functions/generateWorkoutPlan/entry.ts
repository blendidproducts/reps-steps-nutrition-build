import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Narrow, app-specific operation: generates a structured calisthenics workout
// from a free-text prompt. The prompt and exercise list live server-side so
// they cannot be tampered with and credits are billed to the app (service role).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { prompt: userPrompt, duration } = body;
    if (!userPrompt || typeof userPrompt !== 'string') {
      return Response.json({ error: 'A workout description is required' }, { status: 400 });
    }

    const targetDuration = Number(duration) || 30;
    const safePrompt = userPrompt.slice(0, 1000);

    const prompt = `You are a professional fitness trainer. Generate a calisthenics workout based on this EXACT request:

"${safePrompt}"

CRITICAL REQUIREMENTS:
1. Parse the user's request to determine body focus, duration, and intensity
2. If duration is mentioned, respect it EXACTLY
3. If intensity is mentioned (low/moderate/high/easy/hard), respect it
4. If body focus is mentioned (upper/lower/full body/mixed), respect it
5. If not mentioned, use reasonable defaults (30 min, moderate, mixed)
6. If the user asks for specific reps (like 200 pushups), make sure target_reps * sets = requested reps
7. If they ask for cardio (run, sprint), include it with a target_time in seconds

Return a JSON object with this exact structure:
{
  "exercises": [
    {
      "name": "Exercise Name",
      "category": "upper_body|lower_body|core|full_body|cardio",
      "target_reps": 15,
      "target_time": 0,
      "sets": 3,
      "superset_with_next": false
    }
  ],
  "workout_type": "rep_based",
  "estimated_duration": ${targetDuration},
  "difficulty": "beginner|intermediate|advanced"
}

AVAILABLE EXERCISES BY CATEGORY:
UPPER BODY: Push-ups, Wide Push-ups, Diamond Push-ups, Decline Push-ups, Dips, Tricep Dips, Pull-ups, Arm Circles
LOWER BODY: Squats, Jump Squats, Lunges, Calf Raises, Wall Sits, Glute Bridges
CORE: Sit-ups, Crunches, Bicycle Crunches, Russian Twists, Leg Raises, Flutter Kicks, Plank, Mountain Climbers
FULL BODY: Burpees, Jumping Jacks, High Knees, Butt Kickers
CARDIO: Run, Sprint, High Knees

EXERCISE SELECTION RULES:
- Balance exercises across requested body parts
- Calculate exercises based on mentioned duration
- Adjust sets/reps/rest based on mentioned intensity
- Ensure workout fits within time constraints
- Choose realistic exercises that match the body focus and intensity level
- Make it realistic, but always respect specific rep/time requests`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string" },
                target_reps: { type: "number" },
                target_time: { type: "number" },
                sets: { type: "number" },
                superset_with_next: { type: "boolean" }
              }
            }
          },
          workout_type: { type: "string" },
          estimated_duration: { type: "number" },
          difficulty: { type: "string" }
        }
      }
    });

    // Normalize — InvokeLLM with response_json_schema returns a parsed object,
    // but guard against a string return for robustness.
    let parsed = result;
    if (typeof result === 'string') {
      try {
        parsed = JSON.parse(result);
      } catch {
        return Response.json({ error: 'AI returned an unexpected format' }, { status: 502 });
      }
    }

    return Response.json({ workout: parsed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}