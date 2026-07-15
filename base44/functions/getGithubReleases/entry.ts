import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // The GitHub connector token (asServiceRole) has broad 'repo' scope and
        // can read private repos. Restrict this endpoint to admins so standard
        // users cannot query arbitrary (including private) repositories.
        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { owner, repo } = body;

        if (!owner || !repo) {
            return Response.json({ error: 'Owner and repo are required' }, { status: 400 });
        }

        // Strict validation: GitHub owner/repo names only allow alphanumerics,
        // hyphens, underscores, and dots. Reject path traversal and any other chars.
        const namePattern = /^[a-zA-Z0-9_.-]+$/;
        if (!namePattern.test(owner) || !namePattern.test(repo)) {
            return Response.json({ error: 'Invalid owner or repo name' }, { status: 400 });
        }

        // Use the unauthenticated GitHub API so the broad-scope service-role
        // token is never exposed to this endpoint. Only public repositories are
        // accessible; private repos return 404 without the connector token.
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
            headers: {
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