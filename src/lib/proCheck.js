/**
 * proCheck.js — centralized isPro check
 *
 * Add any developer / owner email to DEV_EMAILS to grant full pro access
 * without needing a subscription. Remove this list before public launch.
 */

// Dev bypass removed for launch — Pro access is now real (is_pro / subscription_status / admin).
const DEV_EMAILS = [];

export function checkIsPro(user) {
  if (!user) return false;
  if (DEV_EMAILS.includes((user.email || "").toLowerCase())) return true;
  return (
    user.is_pro === true ||
    user.subscription_status === "pro" ||
    user.role === "admin"
  );
}
