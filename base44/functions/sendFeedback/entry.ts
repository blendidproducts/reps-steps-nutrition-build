import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Narrow, app-specific operation: sends a user feedback email to the app owner.
// Runs server-side (service role) so the SendEmail integration credit is billed
// to the app and the recipient address is not exposed to the client.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, email, message } = body;
    if (!name || !email || !message) {
      return Response.json({ error: 'Name, email, and message are required' }, { status: 400 });
    }

    // Basic sanitization to prevent header / HTML injection in the email body
    const clean = (str) => String(str).replace(/[\r\n<>]/g, ' ').slice(0, 5000);

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'info@repsandsteps.com',
      subject: `RepsAndSteps Feedback from ${clean(name)}`.slice(0, 200),
      body: `
Name: ${clean(name)}
Email: ${clean(email)}

Message:
${clean(message)}
        `
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}