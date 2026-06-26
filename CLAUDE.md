# Reps & Steps — Project Context (CLAUDE.md)
_Repo: blendidproducts/reps-steps-nutrition-build · Last updated: 2026-06-26_

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
- Annual Pro **$99/yr (60-day trial)** → `buy.stripe.com/fZu8wPcSi5muau8fBbbQY0r` · metadata `product_key=pro_annual`
- `pro_monthly` + `pro_annual` → `subscription_status: "pro"`. Fitness Brain & AI Nutrition are SEPARATE add-ons. All-Access ($19.99) = Pro + both. Staying on Stripe.

## Built so far (through ~round 12)
6 workout programs + nutrition (ProgramSeed); Stretches page rebuilt (always-populated library, Mobility tab, instructions, images, inline YouTube, 3D, timer audio, error boundary); Active Session redesigned to mockup (image+timer side-by-side, TIPS, navy full-screen); $9.99 + $99/yr annual toggle on Pricing/Home/AddOns; WorkoutGenie prompt box; front camera default; per-exercise YouTube field + "Add Missing Photos" auto-fill (57 of 83) in admin tools; Program Guides (PDF) page; unified navy (#020817)/blue (#00a9ff) theme.

## Outstanding (in-app, Jace's side)
1. Push → Publish.  2. `/ProgramSeed` → Add 6 programs + nutrition.  3. `/ExerciseSeed` → Fix Stretch Records → Add Missing Photos.  4. `/ExerciseImages` → upload the ~26 exercises with no photo; paste YouTube links.  5. Test $9.99/$99 purchase (Free→Pro).  6. QA pass (connect Claude-in-Chrome to walk the live app).

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
