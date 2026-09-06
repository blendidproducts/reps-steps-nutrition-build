import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Narrow, app-specific operation: analyzes an uploaded food photo and returns
// estimated macros. The client uploads the file (UploadFile) then passes the
// resulting file_url here so the LLM vision call runs server-side (service role).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { file_url } = body;
    if (!file_url || typeof file_url !== 'string') {
      return Response.json({ error: 'A file_url is required' }, { status: 400 });
    }

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a professional nutritionist and food recognition AI. 
Analyze this food photo and identify all food items visible.
For each food item, estimate realistic serving sizes and nutritional values.
Then provide total combined macros for the entire meal in the photo.
Be specific and realistic — base estimates on standard nutritional databases.
If you can't identify something clearly, make a reasonable estimate.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          meal_name: { type: "string", description: "Short descriptive name for the whole meal" },
          description: { type: "string", description: "What you see in the photo" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          foods_detected: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                estimated_serving: { type: "string" },
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fat: { type: "number" }
              }
            }
          },
          total_calories: { type: "number" },
          total_protein: { type: "number" },
          total_carbs: { type: "number" },
          total_fat: { type: "number" },
          total_fiber: { type: "number" },
          health_notes: { type: "string", description: "Brief nutrition quality note" },
          suggested_meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] }
        }
      }
    });

    return Response.json({ analysis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}