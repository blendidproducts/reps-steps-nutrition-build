# Reps & Steps — Project Context (CLAUDE.md)
_Repo: blendidproducts/reps-steps-nutrition-build · Last updated: 2026-07-09_

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

## Status 2026-07-09 (where Jace left off)
- **DONE:** Push → Publish. Live-purchase test + QA pass complete — $9.99/$99 Free→Pro confirmed working on the live app.
- **DONE:** `/ProgramSeed` (6 programs + nutrition) and `/ExerciseSeed` (Fix Stretch Records → Add Missing Photos) both run on the live Base44 app — confirmed 2026-07-01.
- **DONE (round 13, 2026-07-09):** ARTP exercise expansion + AI tracking in program mode + ARTP warm-up. See "Round 13" below.
- **PARTIAL:** Exercise images + YouTube links — some exercises still missing photos and/or video links (`/ExerciseImages`).

## Round 13 — ARTP expansion & AI tracking everywhere (2026-07-09)
Three changes, built in the sync folder and esbuild-verified:
1. **More trackable variations** (`src/lib/exerciseTracking.js`): flipped push-up variations Wide / Diamond / Incline and Tricep Dip to `trackable: true`; added a new **Tricep Extension** entry (elbow-tracked); squat variations Bulgarian Split Squat + Step Up → `trackable: true`. Decline / Pike / Handstand push-ups and Pistol Squat set to `'experimental'` (tracked but Beta-flagged — awkward camera angles are less reliable). All added to `ALL_EXERCISES` in `ARTPWorkout.jsx` so they appear in the ARTP builder.
2. **AI tracking in program/regular mode** (`src/pages/ActiveWorkout.jsx`): the reps counter now shows an "Enable AI Rep Tracking" button whenever the current exercise is body-trackable (via `matchExercise`). It launches `RepTracker` inline; on completion the counted reps flow into the set. Experimental exercises show a BETA tag.
3. **ARTP warm-up** (`src/pages/ARTPWorkout.jsx`): optional guided mobility warm-up (`WARMUP_ROUTINE`, ~2.5 min) with a toggle on the setup screen (remembered in `localStorage` key `artp_warmup`). Runs as a new `warmup` phase before the countdown, with skip-move and skip-all controls.

## Next steps (in order)
1. **QA round 13 on the live app** — ARTP: new variations appear + count reps; warm-up toggle runs the sequence then flows into the workout. Program mode: "Enable AI Rep Tracking" button appears on trackable exercises and records reps. Sanity-check the Beta variations (decline/pike/pistol) count reasonably.
2. **Test Active Session clock/timer stopping** — verify the timer stops correctly during a live session.
3. **Test AI add-on purchases** — Fitness Brain and AI Nutrition are separate Stripe add-ons; run a purchase test for each and confirm the webhook grants the right entitlement (they are NOT covered by `pro_monthly`/`pro_annual`).
4. **Finish `/ExerciseImages`** — upload remaining missing exercise photos; paste remaining YouTube links.
5. Optional polish: custom domain `app.repsandsteps.com` (see Domain below).

## Built so far (through ~round 12)
6 workout programs + nutrition (ProgramSeed); Stretches page rebuilt (always-populated library, Mobility tab, instructions, images, inline YouTube, 3D, timer audio, error boundary); Active Session redesigned to mockup (image+timer side-by-side, TIPS, navy full-screen); $9.99 + $99/yr annual toggle on Pricing/Home/AddOns; WorkoutGenie prompt box; front camera default; per-exercise YouTube field + "Add Missing Photos" auto-fill (57 of 83) in admin tools; Program Guides (PDF) page; unified navy (#020817)/blue (#00a9ff) theme.

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

## Payment confirmed (2026-06-26; re-verified in live QA by 2026-07-01)
- Stripe → Pro WORKS end-to-end: test $9.99 returned webhook 200 `{"success":true,"message":"Activated: pro_monthly"}`. Webhook sets `subscription_status='pro'` (the `is_pro` column staying blank is expected — app reads subscription_status).
- Webhook signature verification rewritten to **Web Crypto** (Deno-native) — removed Node `crypto`/`Buffer`, cleared a High security flag. Same HMAC-SHA256 algorithm; after any change, Resend a Stripe event and expect 200.
- Orange WorkoutGenie card routes to AIWorkoutGenerator (the old pop-up modal black-screened).
- **AI add-ons (Fitness Brain, AI Nutrition) purchase flow NOT yet tested** — see Next steps.

## Gotchas
- Connected-folder editor can truncate large files — edit in a sandbox clone, esbuild-verify, then byte-copy into sync.
- Drive image hotlinks work but can be flaky; `/ExerciseImages` uploads override and are most reliable.
- Base44 build can cache — if the app looks old after a push, refresh the preview and Publish.

## Key files
- `src/pages/Stretches.jsx` — stretch library + Active Session
- `src/pages/ExerciseSeed.jsx` / `ProgramSeed.jsx` / `ExerciseImages.jsx` — admin seeding tools
- `src/pages/Pricing.jsx` / `Home.jsx` / `AddOns.jsx` — pricing & promo
- `base44/functions/stripeWebhook/entry.ts` — Stripe → entitlements
- `src/lib/exerciseTracking.js` — AI pose rep-tracking engine (EXERCISE_LIBRARY, matchExercise, RepCounter)
- `src/index.css` — theme tokens
