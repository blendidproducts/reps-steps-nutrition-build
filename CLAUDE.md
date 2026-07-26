# Reps & Steps — Project Context (CLAUDE.md)
_Repo: blendidproducts/reps-steps-nutrition-build · Last updated: 2026-07-23 (Round 19)_

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

## Round 15 — ARTP QA fixes, second live test (2026-07-13)
Jace's second field test (talk-to-text notes). Five issues; all fixed in the sync folder, esbuild-verified, staged (not yet pushed):
1. **Timed-mode countdown invisible** — the timer existed only as a 24px number in the thin top bar (unreadable from a tripod). `RepTracker` now takes `timedMode`/`secondsLeft` and renders a BIG 64px countdown pill top-center of the camera view (red + pulsing at ≤5 s), and ARTP speaks "10 seconds" then "3, 2, 1" via TTS.
2. **Camera permission asked every exercise** — `RepTracker` stopped its stream on unmount and re-ran getUserMedia per exercise, so iOS re-prompted each time. Now a module-scope shared stream (`acquireCamera`/`releaseSharedCamera`, exported) survives across exercises; ARTP passes `keepCameraAlive` and releases on setup/done/unmount. Facing choice persists (`localStorage rns_cam_facing`). NOTE: iOS Safari may still prompt once per browsing session for the web app — the Capacitor native build remembers permanently.
3. **Summary showed 0 reps for all but the last exercise (+ timer expiry recorded nothing)** — ROOT CAUSE: `finishExercise(pendingReps.current)` ran on timer expiry/skip, but `pendingReps` was only set by the DONE button. `RepTracker` now has `onCountChange` reporting the live count continuously; ARTP keeps `aiRepsRef`/`manualRepsRef` and commits `Math.max` of both. DONE, timer expiry, Skip, and End-Workout all record correct reps now.
4. **Active recovery card needed scrolling** — `GuidedRestScreen` changed from bottom sheet (72vh, justify-end) to a centered card (max-w 560px, 88vh, fully rounded).
5. **Active recovery reachable anywhere** — `ExercisePreviewCard` now has an "ACTIVE RECOVERY — walk · jog · sprint" button (preview phase renders `MidExerciseRecovery`, raised to z 100001 to sit above the preview at 99998). Already existed during exercises (top-bar steps chip) and rests.

## Round 16 — warm-up steps/reps + timed holds (2026-07-15)
From Jace's third test session. Staged in sync folder, esbuild-verified:
1. **Walk in Place warm-up** (`ARTPWorkout.jsx`): new first move in `WARMUP_ROUTINE` (60s, `showSteps`) — `WarmupScreen` takes `totalSteps` and shows a live step counter (also on Marching High Knees). Image: looks up "running in place" etc. in the DB image map; NO Drive image exists yet → emoji fallback until one is uploaded.
2. **Toe Touches rep counter** (`ARTPWorkout.jsx`): `countReps` moves get a tap-to-count button beside the timer (`moveReps`, resets per move).
3. **Wall Sit was rep-based in program mode — root cause: DB record has no `metric`** (ActiveWorkout defaults to 'reps'). Added `metric:"time" + target_time` in `ExerciseSeed.jsx` SEED_EXERCISES for ALL isometric holds: Wall Sit 45, Plank 60, Side Plank 30, Hollow Body Hold 30, L-Sit 20, Bar Hang 30, Handstand Hold 30. ⚠️ Takes effect on the LIVE db only after running `/ExerciseSeed` → "Fix Stretch Records" (its repair pass pushes metric/target_time to existing records). Checked: Stretches.jsx uses a hardcoded library and Exercises.jsx ignores `metric`, so no side effects.
4. **Deliverable:** `Documents\Pers\RepsAndSteps\QA-UPDATE-CHECKLIST.md` — ordered deploy/admin/media checklist (publish → Fix Stretch Records → Add Missing Photos → /ExerciseImages; create a Walk-in-Place image; 4 ARTP images priority).

## Round 17 — Play-guideline fixes: tab navigation + no in-app Stripe (2026-07-20)
From the Google Play guidelines scan on the Base44 mobile build. Additive only — web behavior unchanged. Staged in sync folder, esbuild-verified:
1. **Active-tab re-tap resets to root** — `navigateToTab` in `src/lib/NavigationManager.jsx` now calls `resetTabStack(tab)` + navigates to `TAB_ROOTS[tab]` when the tab is already active; `src/components/BottomNav.jsx` active-tap keeps scroll-to-top AND triggers the reset. ⚠️ Both files were repo-only before — they are now part of the SYNC OVERLAY (edit them in the sync folder from now on).
2. **Stripe hidden inside the app shell** — new `src/lib/nativeShell.jsx`: `isNativeShell()` (window.isNativeApp / Capacitor / Android "wv" UA / iOS WKWebView UA — conservative, normal browsers never match) + `<WebUpgradeNotice/>` card ("visit repsandsteps.com… status syncs instantly"). Applied to ALL Stripe buttons: `Pricing.jsx` (trial, monthly/annual, all-access link, lifetime), `AddOns.jsx` (add-on cards + bundle tiers), `NutritionPricing.jsx` (add-on + all-access). Web users still see checkout unchanged.
- GOTCHA: inserting an import "after the last import line" broke on AddOns.jsx's multi-line lucide import — insert after the closing `} from "lucide-react";` instead.

## Round 18 — AI-generator workout fixes (2026-07-22)
From Jace's AI Workout Generator test. Staged in sync folder, esbuild-verified + node-tested:
1. **Missing images in active recovery (first stretches) — ROOT CAUSE: exact-name DB matching.** Generated workouts save names like "Toe Touches" / "Walk in Place" / "Hip Circles" that never matched DB records ("Toe Touch" / "Running in Place" / "Hip Circle") → no image_url/instructions/metric. `ActiveWorkout.jsx` now uses `findExerciseRecord()` — exact → alias map (walk/march→running in place, arm circles fwd/back→arm circle) → normalized (hyphens→spaces) → per-word singularization (handles -es: touches→touch) → longest-substring fallback. Fixes EXISTING saved workouts too (enrichment runs at load).
2. **Walking/hip circles/toe touches now always timers** — `isTimedName()` coerces stretches (/stretch|opener/), holds (\bhold\b|\bhang\b), and an exact list (walk/march/run in place, jump rope, wall sit, plank, side plank, arm/hip circles, toe touches, cat-cow) to `metric:'time'` (default 30 s if no target). Deliberately NOT matched: Walking Lunge, Plank to Push-Up (rep moves — verified).
3. **Focus-matched dynamic warm-up** (`AIWorkoutGenerator.jsx` `startWorkout`): warm-up now picks lower/upper/mix variants by counting selected exercise categories (2× majority threshold). All stretch names are canonical DB records so images resolve. Chest Opener bumped 15→30 s (two sides).
4. **"Switch sides" halfway voice cue** (`ActiveWorkout.jsx` timed countdown): two-sided stretches (`SWITCH_SIDES_RE`: chest opener, quad/hamstring, hip flexor, figure-4, IT band, neck side, cross-body, overhead tricep, pigeon, spinal twist, calf, side plank, forearm, lat, thread the needle) speak "Switch sides" when crossing the half-time mark (crossing detection, not equality — robust to skipped ticks; only if half ≥ 5 s).
- NOTE: "Walk in Place" images resolve to the "Running in Place" DB record — which still has NO uploaded image (see QA-UPDATE-CHECKLIST.md). Upload one and it appears everywhere.

## Round 19 — ActiveWorkout scroll + superset set-tracking (2026-07-23)
Two fixes in `ActiveWorkout.jsx`, esbuild-verified + simulation-tested:
1. **Workout Plan list was stuck/unscrollable on mobile** — the list is now `max-h-72` with `overscroll-contain`, `-webkit-overflow-scrolling: touch`, and `touch-action: pan-y` (replaced `touch-manipulation`), and auto-scrolls the current exercise into view (`wp-row-{i}` ids + scrollIntoView on index change).
2. **Superset linked MID-workout skipped a round** — ROOT CAUSE: `currentSet` was one GLOBAL counter for the whole superset chain, so a solo set done before linking counted as the pair's first round (partner got 2 of 3). `nextExercise` now tracks per-exercise `completed_sets`; after each set it jumps to the FIRST group member still owing sets and shows that exercise's own set number. Node simulation verified: superset-from-start 3/3, mid-workout link 3/3 (was 3/2), plain exercises unchanged, 3-chain 2/2/2. Also merged the two `setWorkout` spreads in `nextExercise` into one `updatedExercises` array (the split was a lost-update risk). `completed_sets` persists in `activeWorkoutState` automatically.

## Next steps (in order)
0. **Mobile builds + media** (2026-07-14, after a successful live QA pass): see `Documents\Pers\RepsAndSteps\MOBILE-BUILD-PLAN.md` (v2: PRIMARY PATH = Base44 Publish → Mobile app tab builds the AAB and even the iOS IPA in the cloud, no Mac needed; needs Builder plan. Gate 1 = test camera/ARTP inside their web-view wrapper. BLOCKER: Stripe digital-goods subscriptions get store-rejected — hide purchase flows in the mobile app. Capacitor project = Plan B only) and `Exercise_Media_Audit.xlsx` (26 exercises missing images, 59 missing videos; 4 ARTP-tracked ones are priority: Tricep Dip, Reverse Lunge, Bulgarian Split Squat, Decline Push-Up).
1. **Publish in Base44** — rounds 13c+14+15 are ALREADY ON GITHUB (verified 2026-07-14: fresh clone of `main` is byte-identical to the sync folder, incl. Round 15 CLAUDE.md). Just click Publish in Base44, then QA.
   - NOTE: remote also had 3 Base44-side commits (backend functions, package bumps, and a **Community.jsx XSS sanitize fix**). That newer Community.jsx was back-ported INTO the sync folder so future script runs don't regress it.
   - NOTE: the local repo clone had stale `.git` locks + corrupt ORIG_HEAD (from a git run on the connected folder — don't run git through the sandbox mount). `push-reps-updates.ps1` now auto-clears ALL locks and broken ORIG_HEAD before pulling.
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
- **QR code (2026-07-13):** all 29 served pages have a footer "SCAN TO GET THE APP" block (`id=rns-qr-block`, inline-styled, before `</body>`) linking + QR-ing to `https://repsandstepsartp.base44.app`. QR asset: `/public/images/qr-app.png` (brand-blue rounded modules, logo-icon center, error-correction H, decode-verified). Shareable 2048px versions in `Documents\Pers\RepsAndSteps\QR-codes\`. index.html ALSO has a hero QR (`rns-hero-qr`, in the ARTP hero panel beside the Get-the-App CTA; hidden ≤640px since you can't scan your own phone). Skipped: pricing.html (redirect stub) + website-index backups. Regenerate: script pattern in QR-codes (python qrcode+PIL). Remember: site deploys via aplus File Manager/FTP, NOT the push script.
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
