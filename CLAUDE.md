# Reps & Steps — Project Context (CLAUDE.md)
_Repo: blendidproducts/reps-steps-nutrition-build · Last updated: 2026-06-27_

> This file lives at the repo root so any machine that clones the repo (and any Claude session opened on it) has full project context.

## What this is
- **Business:** Reps & Steps — calisthenics/bodyweight fitness app + programs (founder: Jace).
- **Platform:** Base44 app `Reps & Steps-Nutrition BUILD` (app id `6a2c8c120d402896992a9659`), exported as **Vite + React**.
- **Critical:** App DATA (exercises, programs, stretches) lives in the **Base44 database**, not this repo. This repo is the frontend + admin "seed" tools that populate that database.

## Deploy workflow (the only one that works)
1. Edit files in the sync folder: `Documents\Pers\RepsAndSteps\sync-2026-06-16\`
2. Run `Documents\Pers\RepsAndSteps\push-reps-updates.ps1` (PowerShell) — clones/pulls, copies sync files in, commits, pushes. Auto-clears stale `.git/index.lock`. Watch for "PUSHED to GitHub".
3. Base44 auto-syncs the commit → click **Publish** in Base44.
4. **Never** ask the Base44 chatbot to "apply" changes — it only sees what's already on GitHub.

## Stripe (entitlements via base44/functions/stripeWebhook/entry.ts)
- Monthly Pro **$9.99/mo** → `buy.stripe.com/cNi4gzdWmdT09q460BbQY0q` · metadata `product_key=pro_monthly`
- Annual Pro **$99/yr (14-day trial)** → `buy.stripe.com/7sY6oH7xYg18dGkgFfbQY0s` · metadata `product_key=pro_annual`
- `pro_monthly` + `pro_annual` → `subscription_status: "pro"`. Fitness Brain & AI Nutrition are SEPARATE add-ons. All-Access ($19.99) = Pro + both. Staying on Stripe.

## Built so far (through ~round 12)
6 workout programs + nutrition (ProgramSeed); Stretches page rebuilt (always-populated library, Mobility tab, instructions, images, inline YouTube, 3D, timer audio, error boundary); Active Session redesigned to mockup (image+timer side-by-side, TIPS, navy full-screen); $9.99 + $99/yr annual toggle on Pricing/Home/AddOns; WorkoutGenie prompt box; front camera default; per-exercise YouTube field + "Add Missing Photos" auto-fill (57 of 83) in admin tools; Program Guides (PDF) page; unified navy (#020817)/blue (#00a9ff) theme.

## Outstanding (in-app, Jace's side)
1. Push → Publish.  2. `/ProgramSeed` → Add 6 programs + nutrition.  3. `/ExerciseSeed` → Fix Stretch Records → Add Missing Photos.  4. `/ExerciseImages` → upload the ~26 exercises with no photo; paste YouTube links.  5. Test $9.99/$99 purchase (Free→Pro).  6. QA pass (connect Claude-in-Chrome to walk the live app).

## Security (Base44 scanner — addressed 2026-06-26)
- **Exposed secrets (fixed in code):** `stripeWebhook/entry.ts` now reads `STRIPE_WEBHOOK_SECRET` and `STRIPE_SECRET_KEY` from env-var NAMES (was passing the secret value as the key + committing it).
  - **STRIPE_WEBHOOK_SECRET** = required. Stripe → Developers → Webhooks → your endpoint → "Signing secret" (`whsec_…`). If no endpoint exists, create one pointing to the Base44 stripeWebhook function URL (subscribe to `checkout.session.completed` + `customer.subscription.deleted`). **Rotate it** — the old value leaked in the public repo.
  - **STRIPE_SECRET_KEY** = OPTIONAL. Only used for price-ID lookup; the app grants Pro via `product_key` metadata without it. Safe to leave unset. If you do set it: Stripe → Developers → API keys → Secret key (`sk_live_…`).
  - Set these in Base44 → app → Environment variables / Secrets.
- **Unauthenticated function (fixed in code):** `mergeDuplicateExercise/entry.ts` now requires `user.role === 'admin'`.
- **RLS (6 entities):** use Base44 "Fix All" — Exercise = public read / admin write; MealLog, NutritionGoal, WeeklyProgram, Workout, WorkoutSession = record-creator only. Confirm you're admin so seed tools still work.
- **X-Frame-Options:** use Base44 "Fix" (anti-clickjacking on auth/payment pages).
- **Stripe webhook endpoint (working):** `https://reps-steps-nutrition-build-copy-992a9659.base44.app/api/functions/stripeWebhook` (Stripe destination "sophisticated-radiance", Active, 2 events). Repointed from the old `repsandsteps.base44.app` — that mismatch caused early test events to 401. `STRIPE_WEBHOOK_SECRET` set in Base44 → Settings → Secrets.
- **Status 2026-06-26:** Exposed secrets + unauthenticated function = RESOLVED. RLS = "Fix All" applied across all entities (owner-only for personal data; public-read for CommunityPost/preset Food). X-Frame-Options via "Fix". Re-scan should be 0 criticals.

## Domain (future polish)
- App built-in URL is `reps-steps-nutrition-build-copy-992a9659.base44.app` (the "copy" is cosmetic; users won't see it once a custom domain is live).
- Webhook URL is RESOLVED (points to this app, confirmed 200 — see Payment confirmed).
- Optional: connect custom domain **`app.repsandsteps.com`** (CNAME at registrar → Base44 Domains → Connect existing domain), then repoint the Stripe webhook at the custom domain + re-copy its signing secret to `STRIPE_WEBHOOK_SECRET`. See DOMAIN-SETUP.md.

## Access / gating (2026-06-26)
- ARTP (AI Rep Tracking Program) is **Pro-gated** in `src/pages/ARTPWorkout.jsx` via `checkIsPro`. Free build-your-own workout stays free.
- **Dev bypass REMOVED:** `src/lib/proCheck.js` `DEV_EMAILS = []`. Pro access is now real (is_pro / subscription_status==='pro' / role==='admin'). Ensure jacetrimmer@gmail.com is **admin** in Base44 to retain access.

## Payment confirmed (2026-06-26)
- Stripe → Pro WORKS end-to-end: test $9.99 returned webhook 200 `{"success":true,"message":"Activated: pro_monthly"}`. Webhook sets `subscription_status='pro'` (the `is_pro` column staying blank is expected — app reads subscription_status).
- Webhook signature verification rewritten to **Web Crypto** (Deno-native) — removed Node `crypto`/`Buffer`, cleared a High security flag. Same HMAC-SHA256 algorithm; after any change, Resend a Stripe event and expect 200.
- Orange WorkoutGenie card routes to AIWorkoutGenerator (the old pop-up modal black-screened).

## Recent app fixes (2026-06-27)
- **ARTP camera:** now opens the **front-facing camera immediately** (ARTPWorkout passed defaultFacingMode="user"; RepTracker default is also "user").
- **Active Recovery timer:** rewritten as a **wall-clock** countdown in `GuidedRestScreen` (ARTPWorkout) so it no longer freezes when the screen dims / app backgrounds. +/- adjust and cardio-pause preserved.
- **Conditioning moves (High Knee, Jumping Jack, Jump Squat, Butt Kicker):** added a **manual tap rep counter** (`ManualRepCounter`) shown alongside the timer; taps write to `pendingReps` so they're recorded. Pose model can't count these.
- **WorkoutGenie:** orange card on Exercises page routes to AIWorkoutGenerator (old pop-up modal black-screened).
- **Landing page** (`repsandsteps-landing.html`, not in repo — lives in Documents\Pers\RepsAndSteps): navy/blue, Stripe links wired, real logo/banner images.
- **Logo (RESOLVED):** new logo `src/assets/RnS_LOGO.png` bundled into the app; `Layout.jsx` imports it for the header icon (name banner unchanged). Landing page has it base64-embedded. Source file kept in `Documents\Pers\RepsAndSteps\images\`.

## Agents
- `AGENTS.md` (repo root) — Loop-Engineering agent fleet (Builder/Scout/Growth/Orchestrator) for growth. Run in a new session on the **Fable 5** model.

## Gotchas
- Connected-folder editor can truncate large files — edit in a sandbox clone, esbuild-verify, then byte-copy into sync.
- Drive image hotlinks work but can be flaky; `/ExerciseImages` uploads override and are most reliable.
- Base44 build can cache — if the app looks old after a push, refresh the preview and Publish.

## Key files
- `src/pages/Stretches.jsx` — stretch library + Active Session
- `src/pages/ExerciseSeed.jsx` / `ProgramSeed.jsx` / `ExerciseImages.jsx` — admin seeding tools
- `src/pages/Pricing.jsx` / `Home.jsx` / `AddOns.jsx` — pricing & promo
- `base44/functions/stripeWebhook/entry.ts` — Stripe → entitlements
- `src/index.css` — theme tokens
