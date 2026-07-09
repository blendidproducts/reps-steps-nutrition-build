import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// HTML-escape user-supplied values before interpolating into the email body
const escapeHtml = (val) => {
  if (val == null) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
const safeField = (val) => escapeHtml(val) || 'Not provided';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate the user making the request
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const { answers } = payload;
    
    // Find admins to notify
    const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
    const adminEmails = admins.map(admin => admin.email);

    if (adminEmails.length === 0) {
        return Response.json({ success: false, message: "No admins found to notify." });
    }

    const subject = `New Quiz Completed by ${user.full_name || 'a new user'}!`;
    const body = `Great news! A new user just completed the fitness quiz on your app.

Here are their details:
• Name: ${safeField(user.full_name)}
• Email: ${safeField(user.email)}
• Age: ${safeField(answers?.age || user.age)}
• Fitness Level: ${safeField(answers?.fitness_level || user.fitness_level)}
• Goal: ${safeField(answers?.fitness_goals || user.fitness_goals)}

You can log in to your dashboard to see more.
`;

    // Send an email to all admins
    for (const email of adminEmails) {
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: subject,
            body: body,
            from_name: "Reps & Steps App"
        });
    }

    return Response.json({ success: true, notified: adminEmails.length });
  } catch (error) {
    console.error("Error sending quiz notification:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});