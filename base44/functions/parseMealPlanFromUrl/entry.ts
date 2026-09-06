import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Block private/loopback/link-local IPs to prevent SSRF
const isPrivateIp = (ip) => {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127);
  }
  const v6 = ip.toLowerCase();
  if (v6 === '::1' || v6 === '::') return true;
  if (v6.startsWith('fc') || v6.startsWith('fd')) return true;
  if (v6.startsWith('fe80')) return true;
  const mapped = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIp(mapped[1]);
  return false;
};

// Validate scheme + resolve hostname + reject internal destinations.
// Returns the parsed URL, the validated IP, and the original hostname so the
// fetch can connect directly to the pinned IP (DNS-rebinding / TOCTOU safe).
const validateUrl = async (rawUrl) => {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }
  // Restrict to standard web ports to prevent probing internal services on
  // non-standard ports (e.g., databases, Redis, admin panels).
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    throw new Error('Non-standard ports are not allowed');
  }
  const host = parsed.hostname;
  let addresses = [];
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || (host.startsWith('[') && host.endsWith(']'))) {
    addresses = [host.startsWith('[') ? host.slice(1, -1) : host];
  } else {
    try {
      addresses = await Deno.resolveDns(host, 'A');
    } catch {
      try {
        addresses = await Deno.resolveDns(host, 'AAAA');
      } catch {
        throw new Error('Could not resolve hostname');
      }
    }
  }
  if (addresses.length === 0) throw new Error('Could not resolve hostname');
  let validatedIp = null;
  for (const ip of addresses) {
    if (isPrivateIp(ip)) {
      throw new Error('URLs pointing to private or internal addresses are not allowed');
    }
    if (!validatedIp) validatedIp = ip;
  }
  return { url: parsed, ip: validatedIp, host };
};

// Build a fetch URL that connects directly to the validated IP, preserving
// scheme, port, path, and query. IPv6 addresses are bracketed per RFC 3986.
const pinnedUrl = (url, ip) => {
  const ipHost = ip.includes(':') ? `[${ip}]` : ip;
  const port = url.port ? `:${url.port}` : '';
  return `${url.protocol}//${ipHost}${port}${url.pathname}${url.search}`;
};

// Fetch with manual redirect following, re-validating every hop. Connects to
// the validated IP and sends the original hostname in the Host header so the
// target server routes correctly — no second DNS lookup occurs.
const fetchSafe = async (rawUrl, maxRedirects = 5) => {
  let current = await validateUrl(rawUrl);
  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetch(pinnedUrl(current.url, current.ip), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MealPlanBot/1.0)',
        'Host': current.host
      },
      redirect: 'manual'
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return res;
      current = await validateUrl(new URL(location, current.url.href).href);
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects');
};

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
      const pageRes = await fetchSafe(url);
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
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
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