# Reps & Steps — Project Context (CLAUDE.md)
_Repo: blendidproducts/reps-steps-nutrition-build · Last updated: 2026-07-13 (Round 14)_

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

### Round 13b — UI fixes (2026-07-09)
- **Green AI-tracking button** (`ActiveWorkout.jsx`): the program/regular-mode AI button was recolored green and moved onto its own row directly below the VIDEO / 3D buttons (was a blue button buried under the rep counter, hard to spot). Shows a BETA tag for experimental exercises.
- **ARTP START button off-screen fix** (`ARTPWorkout.jsx`): the setup screen is now a full-viewport flex column (`fixed inset-0`) with the START bar as an in-flow footer instead of `fixed bottom-0`. A framer-motion transformed ancestor was trapping the fixed element and pushing START below the viewport.
- **Select all / Clear all**:
  - `ARTPWorkout.jsx` — explicit "Select all" + "Clear all" buttons in the Exercises list header.
  - `Exercises.jsx` — "Select all" (all currently-filtered exercises) + "Clear all" toolbar above the exercise grid, with a live selected count.
  - `WorkoutBuilder.jsx` — "Clear all" on the Exercise List header (no "Select all" here — this screen has no browse list; exercises are chosen on the Exercises page). NOTE: `WorkoutBuilder.jsx` is now part of the sync overlay.

### Round 13c — bug fixes + warm-up images (2026-07-13)
- **ARTP setup "stuck / can't scroll to START" — FIXED (regression from 13b).** Round 13b set the setup screen to `fixed inset-0`, but `fixed` gets trapped by framer-motion's page-transition transform, which constrained the screen and cut off the bottom (mode selector + START) with no way to scroll. Reverted the setup wrapper to `min-h-screen ... flex flex-col` (normal flow); the content stays `flex-1 overflow-y-auto` and the START bar stays an in-flow `flex-shrink-0` footer. **Lesson: don't use `fixed` for the ARTP setup — the Layout's motion transform traps it.**
- **AI Workout Generator scroll** (`AIWorkoutGenerator.jsx`): main content container changed `overflow-hidden` → `overflow-x-hidden` (never block vertical scroll) and bottom padding bumped to `pb-48 sm:pb-44` so the last controls clear the fixed action bar.
- **Warm-up moves now show real photos** (`ARTPWorkout.jsx`): each `WARMUP_ROUTINE` move has `imgKeys` (DB name candidates); `WarmupScreen` takes an `imageMap` prop (passed `exImageMapRef.current`) and renders the exercise photo if found, else the emoji. Photos only appear for moves that have an `image_url` in the Base44 DB (upload missing ones in `/ExerciseImages`).
- **⚠️ GOTCHA HIT:** writing `ARTPWorkout.jsx` directly to the connected sync folder **truncated the file mid-write** (the documented "connected-folder truncates large files" issue). Always esbuild-verify after editing large files in the sync folder before pushing. This round's files were all re-verified with esbuild (`npx esbuild <file> --bundle --external:react --external:'@/*' ...`).

## Round 14 — ARTP QA fixes from Jace's live tripod test (2026-07-13)
Jace field-tested ARTP on an iPhone + tripod (2026-07-13 morning). Six issues reported; all addressed in the sync folder, esbuild-verified, staged (not yet pushed):
1. **Warm-up had no start button** (`ARTPWorkout.jsx` `WarmupScreen`): the timer started ticking on mount and blew through arm circles while the phone was being set up. Now shows a get-ready screen with a **START WARM-UP** button; nothing ticks or speaks until pressed.
2. **Active recovery didn't show what's next** (`GuidedRestScreen`): the UP NEXT card now renders the exercise's real photo (via `exImageMapRef`, falls back to emoji), and TTS announces "Next exercise: [name]" ~3.2 s into the rest (delayed so it doesn't cancel the "set complete" phrase — `speak()` cancels in-progress utterances).
3. **Push-ups/squats missing reps** (`exerciseTracking.js`): thresholds were tuned for a perfect side view; a tripod at an angle reads shallower joint angles, so honest reps never crossed them. Loosened across the push-up family (up 150 / down 100; incline 105) and squat family (up 155 / down 100), with `minRepIntervalMs` (600–700 ms) guarding against double counts. Jace's guess was right: the shoulder→elbow calculation had too little deviation allowance.
4. **Diamond Push-Up tracked zero reps**: it (and Wide/Incline/Tricep Dip) averaged BOTH arms with no visibility fallback — one occluded arm corrupted the average. All elbow-family entries now use a shared `elbowAngle()` helper (better-visible-side fallback, same as the main push-up). Down-threshold 80°→100° also mattered.
5. **Tricep Extension removed from ARTP builder**: it duplicated Tricep Dip (same elbow tracking, not one of the 83 canonical DB exercises, no image). Library entry kept in `exerciseTracking.js` for program-mode name matching; only the `ALL_EXERCISES` card was removed.
6. **Bulgarian Split Squat (untested by Jace)**: found a real bug anyway — it (plus Lunge, Reverse Lunge, Step Up, Pistol) hard-coded the LEFT knee, so right-leg-forward reps were invisible. All single-leg moves now use `workingKneeAngle()` (better-visible leg). Needs live QA.
- **⚠️ GOTCHA HIT AGAIN (three times this round):** connected-folder edits truncated `ARTPWorkout.jsx` mid-write, left trailing NUL bytes on `exerciseTracking.js`, and truncated this `CLAUDE.md`. Recovery: patch a copy in the sandbox, esbuild-verify, byte-copy back, `cmp` to confirm. Always `cmp` + esbuild after ANY edit in the sync folder.

## Next steps (in order)
1. **Push + Publish rounds 13c + 14** — staged in the sync folder, not yet pushed. Run `push-reps-updates.ps1` → Publish.
2. **Re-QA on iPhone + tripod** — warm-up waits for START; rest screen shows next-exercise photo + speaks it; push-up/squat/diamond counts feel right (watch for over-counting now thresholds are looser — tighten toward 95 if shallow reps count); Bulgarian Split Squat with EACH leg forward; confirm Tricep Extension gone from ARTP builder.
3. **QA round 13/13b leftovers** — program mode green "AI REP TRACKING" button records reps; Select all / Clear all; Beta variations (decline/pike/pistol) count reasonably.
4. **Test Active Session clock/timer stopping** — verify the timer stops correctly during a live session.
5. **Test AI add-on purchases** — Fitness Brain and AI Nutrition are separate Stripe add-ons; run a purchase test for each and confirm the webhook grants the right entitlement (they are NOT covered by `pro_monthly`/`pro_annual`).
6. **Finish `/ExerciseImages`** — upload remaining missing exercise photos; paste remaining YouTube links.
7. Optional polish: custom domain `app.repsandsteps.com` (see Domain below).

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
- **Dev bypass REMOVED:** `src/lib/proCheck.js` `DEV_EMAILS = []`. Pro access is real (is_pro / subscription_status==='pro' / role==='admin'). Ensure jacetrimmer@gmail.com is **admin** in Base44 to retain access.

## Payment confirmed (2026-06-26; re-verified in live QA by 2026-07-01)
- Stripe → Pro WORKS end-to-end: test $9.99 returned webhook 200 `{"success":true,"message":"Activated: pro_monthly"}`. Webhook sets `subscription_status='pro'` (the `is_pro` column staying blank is expected — app reads subscription_status).
- Webhook signature verification uses **Web Crypto** (Deno-native). After any change, Resend a Stripe event and expect 200.
- **AI add-ons (Fitness Brain, AI Nutrition) purchase flow NOT yet tested** — see Next steps.

## Marketing website (repsandsteps.com — SEPARATE from this app repo)
- The public site lives on **aplus.net hosting** (HostPapa control panel, my.aplus.net) under `repsandsteps.com` → served from `/public/`. It is **static HTML** (not this repo, not the Base44 app). Local working copy: `Documents\Pers\RepsAndSteps\website-public-updated\public\`. Edit locally, then upload via aplus **File Manager** (Websites → repsandsteps.com → Web Apps → Files → File Manager) or FTP.
- Homepage = `/public/index.html`. Other pages: `app-download.html`, `download.html` (Stripe success), `dashboard.html`, `login/signup`, plus PDF-program pages. `website-index.html` / `website-index_1.html` are backups (not served).
- **All app links funnel to `https://repsandstepsartp.base44.app`** (one of several working hostnames for the same Base44 app; others: `reps-steps-nutrition-build.base44.app`, `...-copy-992a9659...`). Standardized 2026-07-13.
- **`AiRTP`** = the site's brand name for AI Rep Tracking. Homepage has a dedicated `#artp` section (skeleton-tracking stills in `/public/images/artp-*.jpg`, extracted from the exercise videos in `RnS_ARTP/`) + updated app-home image (`images/app-home.jpg`).
- **3D demo POC** = `/public/3d-demo.html` — Google `<model-viewer>` showing animated GLBs (`/public/models/burpee.glb`, `pistol-squat.glb`). Source GLBs in `3D/glb/` were 80–156 MB / 3M-vertex; compressed with **Draco** (gltf-transform) to ~4.7 MB. model-viewer needs **Draco, NOT meshopt** (no bundled meshopt decoder). Models have ~950 units of empty bbox below the feet, so the page reframes on load (target = box center + 0.4×height, radius = 1.8×height).

## Gotchas
- **Connected-folder editor truncates large files mid-write** — edit in a sandbox, esbuild-verify, then byte-copy into sync. Hit this on `ARTPWorkout.jsx` and this `CLAUDE.md` on 2026-07-13.
- Drive image hotlinks work but can be flaky; `/ExerciseImages` uploads override and are most reliable.
- Base44 build can cache — if the app looks old after a push, refresh the preview and Publish.

## Key files
- `src/pages/ARTPWorkout.jsx` — ARTP builder + warm-up + AI rep tracking flow (largest, edit carefully)
- `src/pages/ActiveWorkout.jsx` — program/regular workout mode (+ green AI-tracking button)
- `src/lib/exerciseTracking.js` — AI pose rep-tracking engine (EXERCISE_LIBRARY, matchExercise, RepCounter)
- `src/pages/AIWorkoutGenerator.jsx` — AI workout generator (3-step)
- `src/pages/Exercises.jsx` / `WorkoutBuilder.jsx` — exercise browse + custom builder
- `src/pages/ExerciseImages.jsx` / `ExerciseSeed.jsx` / `ProgramSeed.jsx` — admin seeding tools
- `base44/functions/stripeWebhook/entry.ts` — Stripe → entitlements
