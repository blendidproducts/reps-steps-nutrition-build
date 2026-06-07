import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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
• Name: ${user.full_name || 'Not provided'}
• Email: ${user.email || 'Not provided'}
• Age: ${answers?.age || user.age || 'Not provided'}
• Fitness Level: ${answers?.fitness_level || user.fitness_level || 'Not provided'}
• Goal: ${answers?.fitness_goals || user.fitness_goals || 'Not provided'}

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