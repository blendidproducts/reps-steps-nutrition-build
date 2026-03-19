import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'URL is required' }, { status: 400 });

    // Fetch the page content
    let pageText = '';
    try {
      const pageRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MealPlanBot/1.0)' }
      });
      const html = await pageRes.text();
      // Strip HTML tags to get readable text
      pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 12000); // limit tokens
    } catch (e) {
      return Response.json({ error: 'Could not fetch the URL. Make sure it is publicly accessible.' }, { status: 400 });
    }

    if (!pageText || pageText.length < 100) {
      return Response.json({ error: 'Could not extract content from this URL.' }, { status: 400 });
    }

    // Use LLM to extract structured meal plan
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a nutrition expert. Extract a structured meal plan from the following webpage content.
      
Webpage content:
${pageText}

Extract ALL meals mentioned. For each meal, estimate realistic nutritional values based on ingredients. 
Return a structured meal plan with multiple days if the content covers multiple days, otherwise return a single day plan.
Be generous in extracting meals — find breakfasts, lunches, dinners, snacks, recipes, or any food items mentioned.
If no specific nutritional info is given, estimate realistically based on common values for those foods.`,
      response_json_schema: {
        type: 'object',
        properties: {
          plan_name: { type: 'string', description: 'Name of the meal plan or website' },
          description: { type: 'string', description: 'Brief summary of the meal plan' },
          goal_type: { type: 'string', enum: ['weight_loss', 'muscle_gain', 'maintenance'], description: 'Best matching goal' },
          days: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day_number: { type: 'number' },
                day_name: { type: 'string' },
                meals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
                      meal_name: { type: 'string' },
                      ingredients: { type: 'array', items: { type: 'string' } },
                      instructions: { type: 'string' },
                      calories: { type: 'number' },
                      protein: { type: 'number' },
                      carbs: { type: 'number' },
                      fat: { type: 'number' }
                    }
                  }
                },
                total_calories: { type: 'number' },
                notes: { type: 'string' }
              }
            }
          },
          avg_daily_calories: { type: 'number' },
          avg_daily_protein: { type: 'number' },
          avg_daily_carbs: { type: 'number' },
          avg_daily_fat: { type: 'number' },
          tips: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({ success: true, mealPlan: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});