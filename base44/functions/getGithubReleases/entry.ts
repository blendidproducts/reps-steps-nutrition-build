import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { owner, repo } = body;

        if (!owner || !repo) {
            return Response.json({ error: 'Owner and repo are required' }, { status: 400 });
        }

        const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Base44-App'
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`GitHub API error: ${response.status} ${errText}`);
        }

        const data = await response.json();
        return Response.json({ releases: data });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});