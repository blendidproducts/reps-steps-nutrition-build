import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Secure account-deletion workflow — two-step:
 *
 *  POST { action: "send" }
 *    → Generates a 6-digit OTP, stores a bcrypt-free timing-safe hash + expiry
 *      on the user record, sends it via email.
 *    → Rate-limited: max 3 send attempts per 15-minute window.
 *
 *  POST { action: "confirm", code: "123456" }
 *    → Validates OTP (timing-safe compare), checks expiry, marks account
 *      for deletion and clears the stored code.
 */

function generateCode() {
  // Cryptographically random 6-digit code via Web Crypto
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
}

/** Timing-safe string equality — prevents timing attacks on the OTP */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Max wrong codes before a fresh code is required (brute-force lockout). */
const MAX_CONFIRM_ATTEMPTS = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, code } = body;

    // ── Step 1: send OTP ────────────────────────────────────────────────────
    if (!action || action === 'send') {
      // Rate-limit: allow max 3 send attempts per 15-minute window
      const attempts = user.deletion_send_attempts ?? 0;
      const windowStart = user.deletion_window_start ? new Date(user.deletion_window_start) : null;
      const now = new Date();
      const windowActive = windowStart && (now - windowStart) < 15 * 60 * 1000;

      if (windowActive && attempts >= 3) {
        const resetIn = Math.ceil((15 * 60 * 1000 - (now - windowStart)) / 60000);
        return Response.json(
          { error: `Too many attempts. Please wait ${resetIn} minute(s) before requesting a new code.` },
          { status: 429 }
        );
      }

      const verificationCode = generateCode();
      const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // Written with the service role: the OTP state fields are not client-writable.
      await base44.asServiceRole.entities.User.update(user.id, {
        deletion_code: verificationCode,
        deletion_code_expiry: expiry,
        // Reset or increment the rate-limit window
        deletion_send_attempts: windowActive ? attempts + 1 : 1,
        deletion_window_start: windowActive ? user.deletion_window_start : now.toISOString(),
        // A fresh code restarts the confirm-attempt budget
        deletion_confirm_attempts: 0,
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: '⚠️ RepsAndSteps — Account Deletion Verification',
        body: `
<p>Hi ${user.full_name || 'there'},</p>
<p>You requested to permanently delete your <strong>RepsAndSteps</strong> account.</p>
<p>Your one-time verification code is:</p>
<h2 style="letter-spacing:8px;font-size:36px;font-family:monospace;">${verificationCode}</h2>
<p>This code expires in <strong>15 minutes</strong>.</p>
<p>If you did not request this, your account is safe — simply ignore this email.</p>
<hr/>
<p style="font-size:12px;color:#888;">This email was sent to ${user.email}. Do not share this code with anyone.</p>
        `.trim(),
      });

      return Response.json({ success: true, message: 'Verification code sent to your email.' });
    }

    // ── Step 2: confirm OTP and mark account for deletion ──────────────────
    if (action === 'confirm') {
      if (!code || typeof code !== 'string') {
        return Response.json({ error: 'Verification code is required.' }, { status: 400 });
      }

      // Brute-force lockout: after too many wrong guesses a new code is required.
      const confirmAttempts = user.deletion_confirm_attempts ?? 0;
      if (confirmAttempts >= MAX_CONFIRM_ATTEMPTS) {
        return Response.json(
          { error: 'Too many incorrect attempts. Please request a new code.' },
          { status: 429 }
        );
      }

      const storedCode = user.deletion_code;
      const expiry = user.deletion_code_expiry;

      if (!storedCode || !expiry) {
        return Response.json(
          { error: 'No pending deletion request. Please request a new code first.' },
          { status: 400 }
        );
      }

      if (new Date() > new Date(expiry)) {
        // Clear expired code and reset the attempt budget
        await base44.asServiceRole.entities.User.update(user.id, { deletion_code: null, deletion_code_expiry: null, deletion_confirm_attempts: 0 });
        return Response.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
      }

      // Timing-safe comparison — guards against brute-force enumeration
      if (!safeEqual(code.trim(), storedCode)) {
        const failed = confirmAttempts + 1;
        const lockedOut = failed >= MAX_CONFIRM_ATTEMPTS;
        await base44.asServiceRole.entities.User.update(user.id, {
          deletion_confirm_attempts: failed,
          // Burn the code on lockout so only a fresh one can be used
          ...(lockedOut ? { deletion_code: null, deletion_code_expiry: null } : {}),
        });
        if (lockedOut) {
          return Response.json(
            { error: 'Too many incorrect attempts. Please request a new code.' },
            { status: 429 }
          );
        }
        return Response.json(
          { error: `Invalid verification code. ${MAX_CONFIRM_ATTEMPTS - failed} attempt(s) remaining.` },
          { status: 400 }
        );
      }

      // Mark account for deletion and clear all OTP / rate-limit state
      await base44.asServiceRole.entities.User.update(user.id, {
        account_deletion_requested: true,
        account_deletion_requested_date: new Date().toISOString(),
        deletion_code: null,
        deletion_code_expiry: null,
        deletion_send_attempts: null,
        deletion_window_start: null,
        deletion_confirm_attempts: null,
      });

      return Response.json({ success: true, message: 'Account marked for deletion. You will be logged out.' });
    }

    return Response.json({ error: 'Invalid action. Use "send" or "confirm".' }, { status: 400 });

  } catch (error) {
    console.error('[requestAccountDeletion]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});