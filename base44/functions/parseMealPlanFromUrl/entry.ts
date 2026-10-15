import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hasNutritionAi } from '../../shared/entitlements.ts';

// ── Private / internal address detection (SSRF guard) ───────────────────────
// Every host is parsed into a canonical NUMERIC form before it is classified.
// Textual matching is not safe here: the URL parser rewrites non-canonical
// literals (0177.0.0.1, 2130706433, 0x7f.0.0.1) into a real address, and
// rewrites IPv6 such as [::ffff:127.0.0.1] into [::ffff:7f00:1] — so a check
// that only understands one spelling can be walked straight past.

// Canonical dotted-decimal IPv4 → unsigned 32-bit int, or null. Leading zeros
// are rejected outright: "0177" is octal to the URL parser, not 177.
const parseIPv4 = (str: string): number | null => {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(str);
  if (!m) return null;
  let n = 0;
  for (let i = 1; i <= 4; i++) {
    const part = m[i];
    if (part.length > 1 && part[0] === '0') return null;
    const octet = Number(part);
    if (octet > 255) return null;
    n = n * 256 + octet;
  }
  return n;
};

// Any IPv6 textual form → 8 sixteen-bit groups, or null if not valid IPv6.
const parseIPv6 = (str: string): number[] | null => {
  let s = str;
  const zone = s.indexOf('%');
  if (zone !== -1) s = s.slice(0, zone); // drop zone id (fe80::1%eth0)
  if (s === '' || s.indexOf(':') === -1) return null;

  // Fold a trailing embedded IPv4 quad into two hex groups, so that
  // ::ffff:127.0.0.1 and ::ffff:7f00:1 become the same address.
  const lastColon = s.lastIndexOf(':');
  const tail = s.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseIPv4(tail);
    if (v4 === null) return null;
    s = `${s.slice(0, lastColon + 1)}${((v4 >>> 16) & 0xffff).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }

  const dc = s.indexOf('::');
  if (dc !== -1 && s.indexOf('::', dc + 1) !== -1) return null; // at most one "::"

  const groups = (part: string): number[] | null => {
    if (part === '') return [];
    const out: number[] = [];
    for (const g of part.split(':')) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  };

  const head = groups(dc === -1 ? s : s.slice(0, dc));
  const rest = groups(dc === -1 ? '' : s.slice(dc + 2));
  if (head === null || rest === null) return null;
  if (dc === -1) return head.length === 8 ? head : null;

  const fill = 8 - head.length - rest.length;
  if (fill < 1) return null; // "::" must stand for at least one group
  return [...head, ...new Array(fill).fill(0), ...rest];
};

// Reserved / non-public IPv4 ranges, from the canonical 32-bit value.
const isPrivateIPv4 = (n: number): boolean => {
  const a = (n >>> 24) & 0xff;
  const b = (n >>> 16) & 0xff;
  return (
    a === 0 ||                                // 0.0.0.0/8     "this network"
    a === 10 ||                               // 10.0.0.0/8
    a === 127 ||                              // 127.0.0.0/8   loopback
    (a === 100 && b >= 64 && b <= 127) ||     // 100.64.0.0/10 CGNAT
    (a === 169 && b === 254) ||               // 169.254.0.0/16 link-local
    (a === 172 && b >= 16 && b <= 31) ||      // 172.16.0.0/12
    (a === 192 && b === 168) ||               // 192.168.0.0/16
    (a === 192 && b === 0) ||                 // 192.0.0.0/24 + 192.0.2.0/24
    (a === 198 && (b === 18 || b === 19)) ||  // 198.18.0.0/15 benchmarking
    a >= 224                                  // multicast / reserved / broadcast
  );
};

// Reserved / non-public IPv6 ranges, from the expanded 8-group form.
const isPrivateIPv6 = (g: number[]): boolean => {
  const v4From = (hi: number, lo: number) => isPrivateIPv4(((hi << 16) >>> 0) + lo);
  const zeros = (from: number, to: number) => g.slice(from, to).every((x) => x === 0);

  if (zeros(0, 7)) return g[7] <= 1;                              // ::  and  ::1
  if (zeros(0, 5) && g[5] === 0xffff) return v4From(g[6], g[7]);  // ::ffff:a.b.c.d
  if (zeros(0, 6)) return v4From(g[6], g[7]);                     // ::a.b.c.d (deprecated)
  if ((g[0] & 0xfe00) === 0xfc00) return true;                    // fc00::/7  unique-local
  if ((g[0] & 0xffc0) === 0xfe80) return true;                    // fe80::/10 link-local
  if ((g[0] & 0xff00) === 0xff00) return true;                    // ff00::/8  multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;            // 2001:db8::/32 docs
  if (g[0] === 0x2002) return v4From(g[1], g[2]);                 // 2002::/16 6to4
  if (g[0] === 0x0064 && g[1] === 0xff9b && zeros(2, 6)) {        // 64:ff9b::/96 NAT64
    return v4From(g[6], g[7]);
  }
  return false;
};

// true = private/internal, false = public, null = not an IP literal (a hostname
// the caller must resolve). Anything unclassifiable is treated as unsafe.
const classifyIp = (host: string): boolean | null => {
  const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  const v4 = parseIPv4(bare);
  if (v4 !== null) return isPrivateIPv4(v4);
  const v6 = parseIPv6(bare);
  if (v6 !== null) return isPrivateIPv6(v6);
  return null;
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

    // Server-side entitlement check — the paywall must not rely on the UI alone.
    if (!hasNutritionAi(user)) {
      return Response.json({ error: 'The AI Nutrition add-on is required to import meal plans.' }, { status: 403 });
    }

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