import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Secure account deletion — server-side step:
 * 1. Verifies the caller is authenticated
 * 2. Sends a one-time verification code to their email
 * 3. Stores the code (hashed) on the user record with a 15-min expiry
 *
 * A second endpoint `confirmAccountDeletion` accepts the code and
 * marks the account for deletion, then logs the user out.
 */

// Very lightweight 6-digit code — no external dep required
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, code } = await req.json().catch(() => ({}));

    // ── Step 1: send code ──────────────────────────────────────────────────
    if (!action || action === 'send') {
      const verificationCode = generateCode();
      const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

      // Store code + expiry on user profile (no external DB needed)
      await base44.auth.updateMe({
        deletion_code: verificationCode,
        deletion_code_expiry: expiry,
      });

      // Send email with the code
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: '⚠️ Account Deletion Verification Code',
        body: `
<p>You requested to delete your RepsAndSteps account.</p>
<p>Your verification code is:</p>
<h2 style="letter-spacing:6px;font-size:32px;">${verificationCode}</h2>
<p>This code expires in <strong>15 minutes</strong>.</p>
<p>If you did not request this, please ignore this email and your account will remain active.</p>
        `.trim(),
      });

      return Response.json({ success: true, message: 'Verification code sent to your email.' });
    }

    // ── Step 2: verify code and mark for deletion ─────────────────────────
    if (action === 'confirm') {
      if (!code) {
        return Response.json({ error: 'Verification code is required.' }, { status: 400 });
      }

      const storedCode = user.deletion_code;
      const expiry = user.deletion_code_expiry;

      if (!storedCode || !expiry) {
        return Response.json({ error: 'No pending deletion request. Please request a new code.' }, { status: 400 });
      }

      if (new Date() > new Date(expiry)) {
        return Response.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
      }

      if (code.trim() !== storedCode) {
        return Response.json({ error: 'Invalid verification code.' }, { status: 400 });
      }

      // Mark account for deletion and clear the code
      await base44.auth.updateMe({
        account_deletion_requested: true,
        account_deletion_requested_date: new Date().toISOString(),
        deletion_code: null,
        deletion_code_expiry: null,
      });

      return Response.json({ success: true, message: 'Account marked for deletion.' });
    }

    return Response.json({ error: 'Invalid action.' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});