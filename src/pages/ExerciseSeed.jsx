/**
 * ExerciseSeed.jsx — Admin tool to restore all 51 exercises to the database.
 * Uses base44.entities.Exercise directly (same as Upload3DModels.jsx) with a
 * hard per-call timeout so a hung request never stalls the whole restore.
 */

import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CheckCircle, XCircle, AlertTriangle, RefreshCw, ChevronLeft,
  Dumbbell, StopCircle
} from "lucide-react";

// ── Timeout helper ────────────────────────────────────────────────────────────
// Wraps any promise with a hard timeout so a hung API call doesn't freeze the UI.
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// ── Full exercise seed data ───────────────────────────────────────────────────
// Only sends the 4 fields every Exercise entity definitely has:
//   name · category · difficulty · description
// (muscle_groups / instructions are added to description as plain text)
const SEED_EXERCISES = [
  // PUSH
  { name: "Push-Up",           category: "upper_body", difficulty: "beginner",     description: "Classic bodyweight push. Muscles: Chest, Triceps, Shoulders. Cues: Keep body straight, lower chest to floor, full lockout at top." },
  { name: "Diamond Push-Up",   category: "upper_body", difficulty: "intermediate", description: "Hands form a diamond beneath the chest. Muscles: Triceps, Inner Chest. Cues: Elbows tight to body, full tricep extension." },
  { name: "Wide Push-Up",      category: "upper_body", difficulty: "beginner",     description: "Hands wider than shoulders. Muscles: Outer Chest, Shoulders. Cues: Fingers slightly outward, squeeze chest at top." },
  { name: "Pike Push-Up",      category: "upper_body", difficulty: "intermediate", description: "Hips raised in inverted-V, shoulder press pattern. Muscles: Shoulders, Triceps. Cues: Head toward floor, press through shoulders." },
  { name: "Decline Push-Up",   category: "upper_body", difficulty: "intermediate", description: "Feet elevated to target upper chest. Muscles: Upper Chest, Shoulders. Cues: Straight body line, lower chest toward floor." },
  { name: "Incline Push-Up",   category: "upper_body", difficulty: "beginner",     description: "Hands elevated — reduced load for beginners. Muscles: Lower Chest, Triceps. Cues: Keep body straight throughout." },
  { name: "Tricep Dip",        category: "upper_body", difficulty: "beginner",     description: "Chair or bench dip. Muscles: Triceps, Shoulders. Cues: Hips close to bench, lower until 90 degree elbow angle." },
  { name: "Handstand Push-Up", category: "upper_body", difficulty: "advanced",     description: "Inverted push against wall. Muscles: Shoulders, Triceps, Core. Cues: Wall for support, head toward floor, full shoulder press range." },
  // PULL
  { name: "Pull-Up",           category: "upper_body", difficulty: "intermediate", description: "Overhand grip pull. Muscles: Lats, Biceps, Rear Deltoids. Cues: Full hang at bottom, chin over bar at top." },
  { name: "Chin-Up",           category: "upper_body", difficulty: "intermediate", description: "Underhand grip pull. Muscles: Biceps, Lats. Cues: Supinated grip, chin above bar, full hang at bottom." },
  { name: "Australian Row",    category: "upper_body", difficulty: "beginner",     description: "Horizontal bodyweight row. Muscles: Upper Back, Biceps. Cues: Keep body rigid, pull chest to bar, squeeze shoulder blades." },
  { name: "Muscle-Up",         category: "upper_body", difficulty: "advanced",     description: "Explosive pull transitioning into a dip. Muscles: Lats, Chest, Triceps. Cues: Explosive pull, transition above bar, press out at top." },
  // LEGS
  { name: "Squat",                 category: "lower_body", difficulty: "beginner",     description: "Fundamental lower-body squat. Muscles: Quadriceps, Glutes, Hamstrings. Cues: Break parallel, drive through heels, knees track over toes." },
  { name: "Jump Squat",            category: "lower_body", difficulty: "intermediate", description: "Explosive squat for power. Muscles: Quads, Glutes, Calves. Cues: Explode upward, land softly with bent knees." },
  { name: "Sumo Squat",            category: "lower_body", difficulty: "beginner",     description: "Wide-stance squat. Muscles: Inner Thighs, Glutes, Quads. Cues: Feet wide, toes at 45 degrees, thighs to parallel." },
  { name: "Lunge",                 category: "lower_body", difficulty: "beginner",     description: "Forward step lunge. Muscles: Quads, Glutes, Hamstrings. Cues: Front knee behind toes, back knee near floor, upright torso." },
  { name: "Reverse Lunge",         category: "lower_body", difficulty: "beginner",     description: "Step backward into lunge. Muscles: Quads, Glutes, Hamstrings. Cues: Step backward, control the descent, push through front heel." },
  { name: "Bulgarian Split Squat", category: "lower_body", difficulty: "advanced",     description: "Rear-foot elevated split squat. Muscles: Quads, Glutes, Hip Flexors. Cues: Rear foot on bench, torso upright, deep range of motion." },
  { name: "Step Up",               category: "lower_body", difficulty: "beginner",     description: "Step onto elevated surface. Muscles: Quads, Glutes, Hamstrings. Cues: Drive through heel, full hip extension at top." },
  { name: "Glute Bridge",          category: "lower_body", difficulty: "beginner",     description: "Floor hip extension. Muscles: Glutes, Hamstrings. Cues: Squeeze glutes at top, feet flat, full hip extension." },
  { name: "Donkey Kick",           category: "lower_body", difficulty: "beginner",     description: "Quadruped glute kick. Muscles: Glutes, Hip Extensors. Cues: Keep knee at 90 degrees, kick heel toward ceiling." },
  { name: "Calf Raise",            category: "lower_body", difficulty: "beginner",     description: "Rise onto toes. Muscles: Calves, Soleus. Cues: Full range at top, controlled descent, hold at peak contraction." },
  { name: "Wall Sit",              category: "lower_body", difficulty: "intermediate", description: "Isometric quad hold. Muscles: Quadriceps, Glutes. Cues: Knees at 90 degrees, back flat on wall, thighs parallel to floor." },
  { name: "Pistol Squat",          category: "lower_body", difficulty: "advanced",     description: "Single-leg squat to full depth. Muscles: Quads, Glutes, Core. Cues: One leg extended forward, full depth, control the descent." },
  // CORE
  { name: "Sit-Up",           category: "core", difficulty: "beginner",     description: "Full range sit-up. Muscles: Abs, Hip Flexors. Cues: Feet flat, hands behind head, full range touching knees." },
  { name: "Crunch",           category: "core", difficulty: "beginner",     description: "Short-range ab crunch. Muscles: Abs. Cues: Short range of motion, contract abs hard, chin slightly off chest." },
  { name: "Leg Raise",        category: "core", difficulty: "intermediate", description: "Leg raise for lower abs. Muscles: Lower Abs, Hip Flexors. Cues: Press lower back down, keep legs straight, controlled descent." },
  { name: "Plank",            category: "core", difficulty: "beginner",     description: "Isometric full-body hold. Muscles: Core, Shoulders, Glutes. Cues: Straight line head to heels, squeeze core and glutes." },
  { name: "Side Plank",       category: "core", difficulty: "intermediate", description: "Lateral isometric hold. Muscles: Obliques, Core. Cues: Stack feet, hips elevated, straight line head to feet." },
  { name: "Bicycle Crunch",   category: "core", difficulty: "intermediate", description: "Alternating elbow to knee. Muscles: Obliques, Abs. Cues: Opposite elbow to knee, fully extend other leg, control the rotation." },
  { name: "Mountain Climber", category: "core", difficulty: "intermediate", description: "Alternating knee drives in plank. Muscles: Core, Shoulders, Hip Flexors. Cues: Keep hips level, drive each knee toward chest." },
  { name: "Flutter Kick",     category: "core", difficulty: "intermediate", description: "Rapid alternating leg kicks. Muscles: Lower Abs, Hip Flexors. Cues: Small rapid alternating kicks, lower back pressed down." },
  { name: "Dead Bug",         category: "core", difficulty: "intermediate", description: "Anti-extension core move. Muscles: Deep Core, Hip Flexors. Cues: Lower back flat on floor, opposite arm and leg extend." },
  { name: "Hollow Body Hold", category: "core", difficulty: "advanced",     description: "Gymnastics tension hold. Muscles: Core, Hip Flexors, Lats. Cues: Lower back pressed to floor, arms overhead, feet 6 inches up." },
  { name: "V-Up",             category: "core", difficulty: "advanced",     description: "Explosive simultaneous arm and leg raise. Muscles: Abs, Hip Flexors. Cues: Lift arms and legs simultaneously, touch feet at top." },
  { name: "Russian Twist",    category: "core", difficulty: "intermediate", description: "Seated rotation. Muscles: Obliques. Cues: Lean back 45 degrees, rotate side to side, feet off floor for difficulty." },
  { name: "Shoulder Tap",     category: "core", difficulty: "intermediate", description: "Alternating shoulder taps in plank. Muscles: Core, Shoulders. Cues: Minimal hip rotation, hold plank position." },
  { name: "L-Sit / Pike Hold",category: "core", difficulty: "advanced",     description: "Gymnastics hold legs parallel. Muscles: Hip Flexors, Core, Triceps. Cues: Legs parallel to ground, arms fully straight." },
  // FULL BODY
  { name: "Burpee",       category: "full_body", difficulty: "intermediate", description: "Full-body conditioning exercise. Muscles: Full Body, Cardio. Cues: Squat, plank, push-up, jump. Land softly." },
  { name: "Jumping Jack", category: "full_body", difficulty: "beginner",     description: "Classic cardio movement. Muscles: Cardio, Shoulders, Legs. Cues: Arms overhead, feet wide on open, back together on close." },
  { name: "High Knee",    category: "full_body", difficulty: "beginner",     description: "Running in place, knees to hip height. Muscles: Cardio, Hip Flexors, Core. Cues: Drive knees to hip height, pump arms." },
  { name: "Butt Kicker",  category: "full_body", difficulty: "beginner",     description: "Jog in place kicking heels to glutes. Muscles: Cardio, Hamstrings. Cues: Kick heels to glutes, keep knees down." },
  { name: "Inchworm",     category: "full_body", difficulty: "intermediate", description: "Walk hands to plank and back. Muscles: Hamstrings, Core, Shoulders. Cues: Walk hands out to plank, keep legs straight, walk back." },
  { name: "Bear Crawl",   category: "full_body", difficulty: "intermediate", description: "Quadruped crawl with knees hovering. Muscles: Core, Shoulders, Quads. Cues: Knees 1 inch off floor, opposite hand and foot move together." },
  { name: "Box Jump",     category: "full_body", difficulty: "intermediate", description: "Explosive jump onto elevated surface. Muscles: Quads, Glutes, Calves. Cues: Load hips, explode up, land softly with bent knees." },
  // MOBILITY  (metric:"time" so they appear in the Stretches > Mobility tab, which lists Exercise records with metric:"time")
  { name: "Arm Circle",   category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Full shoulder rotation warm-up. Muscles: Shoulders, Rotator Cuff. Cues: Make large circles, raise arm fully overhead each revolution." },
  { name: "Hip Circle",   category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Standing hip rotation. Muscles: Hip Flexors, Glutes. Cues: Full circular motion, keep feet planted, rotate both directions." },
  { name: "Cat-Cow",      category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Spinal flexion and extension on all fours. Muscles: Spine, Core. Cues: Exhale arch (cat), inhale sag (cow), slow and controlled." },
  { name: "Quad Stretch", category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Standing quad and hip flexor stretch. Muscles: Quadriceps, Hip Flexors. Cues: Pull foot to glute, keep knees together, stand tall." },
  { name: "Toe Touch",    category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Standing hamstring stretch. Muscles: Hamstrings, Lower Back. Cues: Straight legs, reach for toes, slow stretch." },
  // NEW -- added from Drive media gap analysis (2026-06-12)
  { name: "Toes to Bar",     category: "core",       difficulty: "advanced",     description: "Hanging leg raise touching toes to the bar overhead. Muscles: Abs, Hip Flexors, Lats, Grip. Cues: Controlled swing, keep legs straight, touch toes to bar, lower with control -- avoid kipping with momentum only." },
  { name: "Superman",        category: "core",       difficulty: "beginner",     description: "Prone back extension lifting arms and legs off the floor. Muscles: Lower Back, Glutes, Shoulders. Cues: Lie face down, lift arms and legs simultaneously, hold briefly at the top, squeeze glutes and lower back." },
  { name: "Fire Hydrant",    category: "lower_body", difficulty: "beginner",     description: "Quadruped hip abduction kick to the side. Muscles: Glutes, Hip Abductors. Cues: Keep knee bent at 90 degrees, lift leg out to the side, avoid rotating the hips, controlled tempo each rep." },
  { name: "Bar Hang / Dead Hang", category: "upper_body", difficulty: "beginner", description: "Passive hang from a pull-up bar with full arm extension. Muscles: Grip, Lats, Shoulders, Forearms. Cues: Relax shoulders away from ears, full arm extension, breathe steadily, build grip and shoulder endurance over time." },
  { name: "Jump Rope",       category: "full_body",  difficulty: "beginner",     description: "Cardio jumping with a rope. Muscles: Calves, Shoulders, Cardio. Cues: Small low hops, let the wrists do the turning, land softly on the balls of the feet, keep elbows close to the body." },
  { name: "Running in Place", category: "full_body", difficulty: "beginner",     description: "Stationary jogging cardio movement. Muscles: Cardio, Quads, Calves. Cues: Pump the arms, take light quick steps, maintain a steady rhythm and upright posture." },
  { name: "Dragon Squat",    category: "lower_body", difficulty: "advanced",     description: "Deep single-leg squat with the rear leg extended behind (pistol-squat style progression). Muscles: Quads, Glutes, Hip Flexors, Balance. Cues: Sit back into a deep squat, extend the rear leg behind you, keep the chest up, control the descent and ascent." },
  { name: "Handstand Hold",  category: "upper_body", difficulty: "advanced",     description: "Inverted bodyweight hold, typically against a wall. Muscles: Shoulders, Core, Triceps. Cues: Use the wall for support, stack hips directly over shoulders, engage the core, point the toes and hold steady." },
  { name: "Plank to Push-Up", category: "core",      difficulty: "intermediate", description: "Alternate between forearm plank and push-up (high plank) position one arm at a time. Muscles: Core, Shoulders, Triceps. Cues: Move one arm at a time, keep hips stable and level, avoid rotating the torso." },
  // NEW -- stretches (mobility), category: "mobility", appear in Stretches.jsx "Individual Stretches" via Exercise.filter({metric:"time"})
  { name: "Calf Stretch (wall)",    category: "mobility", difficulty: "beginner",     metric: "time", target_time: 30, description: "Wall-supported calf and Achilles stretch. Muscles: Calves, Achilles. Cues: Back leg straight with heel pressed down, lean into the wall, hold without bouncing." },
  { name: "IT Band Stretch",        category: "mobility", difficulty: "intermediate", metric: "time", target_time: 30, description: "Standing or seated outer-thigh and IT band stretch. Muscles: IT Band, Outer Hip, Glutes. Cues: Cross one leg in front of the other, lean gently to the side, hold without bouncing." },
  { name: "Thread the Needle",      category: "mobility", difficulty: "beginner",     metric: "time", target_time: 30, description: "Spinal rotation stretch from a quadruped position. Muscles: Upper Back, Shoulders, Spine. Cues: Thread one arm under the body, rest the shoulder and head on the floor, breathe into the stretch." },
  { name: "Seated Forward Fold",    category: "mobility", difficulty: "beginner",     metric: "time", target_time: 30, description: "Seated hamstring and lower back stretch. Muscles: Hamstrings, Lower Back. Cues: Hinge at the hips with a long spine, reach toward the toes, avoid rounding the lower back forcefully." },
  { name: "Overhead Lat Stretch",   category: "mobility", difficulty: "beginner",     metric: "time", target_time: 30, description: "Standing lat and side-body stretch. Muscles: Lats, Obliques, Shoulders. Cues: Reach one arm overhead and lean to the opposite side, keep the hips square and facing forward." },
  { name: "Overhead Tricep Stretch", category: "mobility", difficulty: "beginner",    metric: "time", target_time: 30, description: "Standing tricep and shoulder stretch. Muscles: Triceps, Shoulders. Cues: Bend one elbow overhead, gently pull the elbow with the opposite hand, keep the chest lifted." },
  { name: "Knees to Chest",         category: "mobility", difficulty: "beginner",     metric: "time", target_time: 30, description: "Supine lower-back release stretch. Muscles: Lower Back, Glutes, Hips. Cues: Pull both knees toward the chest, relax the shoulders flat on the floor, breathe slowly." },
  { name: "Forearm Stretch",        category: "mobility", difficulty: "beginner",     metric: "time", target_time: 20, description: "Wrist and forearm flexor/extensor stretch. Muscles: Forearms, Wrists. Cues: Extend the arm with palm up, gently pull the fingers back toward the body, then flip the hand over for the top-of-forearm stretch." },
  // NEW -- individual stretch records referenced by STRETCH_PROGRAMS in Stretches.jsx (2026-06-12)
  // category aligned to Stretches.jsx CATEGORIES filter (upper_body/lower_body/core/full_body)
  { name: "Standing Hamstring Stretch", category: "lower_body", difficulty: "beginner",     metric: "time", target_time: 30, description: "Standing forward reach targeting the hamstrings. Muscles: Hamstrings, Calves. Cues: Slight knee bend, hinge at the hips, reach toward the toes, keep the back straight." },
  { name: "Hip Flexor Lunge Stretch",   category: "lower_body", difficulty: "beginner",     metric: "time", target_time: 30, description: "Kneeling lunge stretch for the front hip. Muscles: Hip Flexors, Quadriceps. Cues: Back knee down, push the hips forward gently, keep the torso upright." },
  { name: "Seated Butterfly Stretch",   category: "lower_body", difficulty: "beginner",     metric: "time", target_time: 30, description: "Seated inner-thigh stretch with soles of the feet together. Muscles: Inner Thighs, Hips. Cues: Sit tall, let the knees drop toward the floor, gently press the knees down for more stretch." },
  { name: "Chest Opener Stretch",       category: "upper_body", difficulty: "beginner",     metric: "time", target_time: 20, description: "Standing chest and shoulder opener with hands clasped behind the back. Muscles: Chest, Shoulders. Cues: Clasp hands behind the back, lift the chest, draw the shoulder blades together." },
  { name: "Neck Side Stretch",          category: "upper_body", difficulty: "beginner",     metric: "time", target_time: 20, description: "Lateral neck stretch for tension relief. Muscles: Neck, Upper Traps. Cues: Tilt the head gently to one side, use the hand for light overpressure, keep the shoulders relaxed." },
  { name: "Child's Pose",               category: "full_body",  difficulty: "beginner",     metric: "time", target_time: 45, description: "Kneeling forward fold stretching the back and shoulders. Muscles: Lower Back, Lats, Hips. Cues: Sit the hips back toward the heels, reach the arms forward, relax the head down." },
  { name: "Pigeon Pose",                category: "lower_body", difficulty: "intermediate", metric: "time", target_time: 45, description: "Deep hip and glute opener. Muscles: Glutes, Hip Rotators. Cues: Front shin angled forward, back leg extended straight, square the hips, fold forward gently." },
  { name: "World's Greatest Stretch",   category: "full_body",  difficulty: "intermediate", metric: "time", target_time: 30, description: "Dynamic multi-plane lunge and rotation stretch. Muscles: Hips, Hamstrings, Spine, Shoulders. Cues: Step into a lunge, drop the back hand down, rotate the opposite arm toward the ceiling, move smoothly between positions." },
  { name: "Downward Dog",               category: "full_body",  difficulty: "intermediate", metric: "time", target_time: 40, description: "Inverted V stretch for the posterior chain. Muscles: Hamstrings, Calves, Shoulders, Back. Cues: Press the hips up and back, straighten the legs as much as comfortable, press through the hands." },
  { name: "Seated Spinal Twist",        category: "core",       difficulty: "intermediate", metric: "time", target_time: 30, description: "Seated rotational stretch for the spine and obliques. Muscles: Spine, Obliques, Lower Back. Cues: Sit tall, rotate the torso toward the back leg, use the arm for gentle leverage, keep the hips square." },
  { name: "Figure-4 Glute Stretch",     category: "lower_body", difficulty: "intermediate", metric: "time", target_time: 40, description: "Supine or seated glute and piriformis stretch. Muscles: Glutes, Piriformis, Hips. Cues: Cross one ankle over the opposite knee, gently pull the thigh toward the chest, keep the crossed foot flexed." },
  { name: "Doorway Chest Stretch",      category: "upper_body", difficulty: "intermediate", metric: "time", target_time: 30, description: "Chest and front-shoulder stretch using a doorway or wall. Muscles: Chest, Front Deltoids, Biceps. Cues: Forearm on the frame at shoulder height, gently rotate the body away, keep the elbow slightly below shoulder height." },
  { name: "Cobra Stretch",              category: "core",       difficulty: "advanced",     metric: "time", target_time: 60, description: "Prone backbend opening the front body. Muscles: Abs, Lower Back, Hip Flexors. Cues: Press through the hands, lift the chest while keeping the hips down, ease into the range without forcing." },
  { name: "Supine Spinal Twist",        category: "core",       difficulty: "advanced",     metric: "time", target_time: 60, description: "Lying rotational stretch for the spine and glutes. Muscles: Spine, Glutes, Obliques. Cues: Lie on the back, drop both knees to one side, keep the shoulders flat on the floor, breathe into the stretch." },
  { name: "Standing Quadriceps Stretch", category: "lower_body", difficulty: "advanced",    metric: "time", target_time: 45, description: "Standing front-thigh stretch. Muscles: Quadriceps, Hip Flexors. Cues: Pull the heel toward the glutes, keep the knees together, stand tall and use support if needed." },
  { name: "Shoulder Cross-Body Stretch", category: "upper_body", difficulty: "advanced",    metric: "time", target_time: 45, description: "Cross-body stretch for the rear shoulder. Muscles: Rear Deltoids, Upper Back. Cues: Pull one arm across the chest, use the opposite arm for gentle pressure, keep the shoulder down away from the ear." },
];

const DIFF_COLOUR = {
  beginner:     "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  advanced:     "bg-red-500/20 text-red-400 border-red-500/30",
};
const CAT_LABEL = {
  upper_body: "Upper Body", lower_body: "Lower Body",
  core: "Core", full_body: "Full Body", mobility: "Mobility",
};

// ── Stretch media + auto-generated instructions ─────────────────────────────
// Drive thumbnail hotlinks for stretches that have a photo. image_url is only
// written to records that have NONE, so a later upload via /ExerciseImages
// always wins. If a Drive thumbnail does not load, upload via /ExerciseImages.
const STRETCH_MEDIA = {}; // Drive links removed — they do not hotlink reliably. Use /ExerciseImages to upload hosted photos.

// Drive-hosted demo videos (open in Drive's player via the session "Video" button).
// Paste a real YouTube link per stretch any time via /ExerciseImages to override.
const STRETCH_VIDEO = {
  "Arm Circle": "https://drive.google.com/file/d/1EoTc8pVfoPWAGqKUN6ItDlrK2DbZ3k9i/view",
  "Cat-Cow": "https://drive.google.com/file/d/12JsZC3kXSTzN6b7e24au-EWwH-VbcevU/view",
  "Chest Opener Stretch": "https://drive.google.com/file/d/1udhh3VgtlTWIaDk36TRWCvTrj67wNLDR/view",
  "Hip Circle": "https://drive.google.com/file/d/12H1c8kN37ndhV-0QPzhtknZ6a86qCm0E/view",
  "Quad Stretch": "https://drive.google.com/file/d/1_Qd5M_602Hp6nmQ3CLe-P0UOTJUEY2jK/view",
  "Shoulder Cross-Body Stretch": "https://drive.google.com/file/d/1f_-KSHQg4U1xM0EuSHVGy8jpxcaSvYjB/view",
};

// Drive photo per exercise (auto-fills image_url for any exercise missing one).
// Uploads via /ExerciseImages always take precedence.
const EXERCISE_MEDIA = {
  "Push-Up": "https://drive.google.com/thumbnail?id=1HMWpziu0AUp0jsJSVNcjYzW8GLzIpfT7&sz=w1000",
  "Diamond Push-Up": "https://drive.google.com/thumbnail?id=1S6ngmhYrIe2qfEEsW3Zkc6lWrmVueotg&sz=w1000",
  "Wide Push-Up": "https://drive.google.com/thumbnail?id=1ALG00vEoYVg2aLCTayrPcpB5XppFE874&sz=w1000",
  "Pike Push-Up": "https://drive.google.com/thumbnail?id=1zU_KlJ5Ff3HoJS4Pv0pvTMetvcSmTkiK&sz=w1000",
  "Decline Push-Up": "https://drive.google.com/thumbnail?id=10KMg3tMfxg_A60lWOVWj0HRjEHMj_AbP&sz=w1000",
  "Incline Push-Up": "https://drive.google.com/thumbnail?id=1eC7vLGZe-va22XVDnJbxInFo6a5B2SMw&sz=w1000",
  "Pull-Up": "https://drive.google.com/thumbnail?id=16KeHPC2IdVzONfFp8Ed1sRWUW-I3XUtM&sz=w1000",
  "Chin-Up": "https://drive.google.com/thumbnail?id=1k61uADO3Gp-0haD9eTWTtCzLq9Jqk_Z2&sz=w1000",
  "Squat": "https://drive.google.com/thumbnail?id=1VgYXaDXmZmOPagKK2hsI8VG-m_Ci1YN1&sz=w1000",
  "Jump Squat": "https://drive.google.com/thumbnail?id=1DKTa1XAzoZrFhkZN4JcgU9B1oazUjygb&sz=w1000",
  "Sumo Squat": "https://drive.google.com/thumbnail?id=1-2FfSvBOf-0uvmYZcdw_ISo_tUiMouy9&sz=w1000",
  "Lunge": "https://drive.google.com/thumbnail?id=11Q7MJQJsGYYx93RZOcoz1xLIu5d8zgRp&sz=w1000",
  "Step Up": "https://drive.google.com/thumbnail?id=12wunZ_b9KrzhoORx1Hl40dpyAWabJ_ZS&sz=w1000",
  "Glute Bridge": "https://drive.google.com/thumbnail?id=1NtWZYNKWT5bjcPngUOFn0YnOHNNNdLKS&sz=w1000",
  "Donkey Kick": "https://drive.google.com/thumbnail?id=1FVw6s6SXjvqy3vdpWvC1kGizWFg_fSIx&sz=w1000",
  "Calf Raise": "https://drive.google.com/thumbnail?id=1NZu7GenvR35Wzo3p6IwYzhxP0yUsr5Ye&sz=w1000",
  "Wall Sit": "https://drive.google.com/thumbnail?id=1gsmdE_mWZa2oL5NEzM0NbrW1r2noGXCJ&sz=w1000",
  "Pistol Squat": "https://drive.google.com/thumbnail?id=1085tSRtM7t7Sa6FE2mJeM6iBQQt5C0j4&sz=w1000",
  "Sit-Up": "https://drive.google.com/thumbnail?id=1ssZL-3MsPknSRXMdHEg0SuYF2ouVHNtq&sz=w1000",
  "Crunch": "https://drive.google.com/thumbnail?id=1CiFEIBsbFcxaEvuvzLwHPjOsT-B4HfSh&sz=w1000",
  "Leg Raise": "https://drive.google.com/thumbnail?id=1njnM73yydzMjHbR1fhHGwKDyYiGNEe5z&sz=w1000",
  "Plank": "https://drive.google.com/thumbnail?id=147ghs-7mY0CMOOfeBZz33dyGfRvqRADB&sz=w1000",
  "Side Plank": "https://drive.google.com/thumbnail?id=1_9mHQkUc_twvzGpmD2IuyzOMcPhYGaD3&sz=w1000",
  "Bicycle Crunch": "https://drive.google.com/thumbnail?id=1Y7x6-02h411VHCK3K8QUe7uN1HNJCpxn&sz=w1000",
  "Mountain Climber": "https://drive.google.com/thumbnail?id=1XZAKxB01uAEDgND8_uzoEgO_6pmKKhv4&sz=w1000",
  "Flutter Kick": "https://drive.google.com/thumbnail?id=1198ctXKnzua9b9ytShpEXAwDZojP2RvO&sz=w1000",
  "Dead Bug": "https://drive.google.com/thumbnail?id=1rBV7HZ3xhTvCqVl-g0DMstJf2qq_o7S5&sz=w1000",
  "Hollow Body Hold": "https://drive.google.com/thumbnail?id=1XFIiHd1iM8OaP6HiyZ4OwVxbIznPDThc&sz=w1000",
  "V-Up": "https://drive.google.com/thumbnail?id=1lWBdTxgTfSNkyid-vY7Qaizpa_k3Zbw4&sz=w1000",
  "Russian Twist": "https://drive.google.com/thumbnail?id=1DJLHV-8KQwTxOuT87-MmrTb4AwtCEgec&sz=w1000",
  "L-Sit / Pike Hold": "https://drive.google.com/thumbnail?id=1NlrhJbQeZ2mdFH0hSCoaye4KnSUxdIeg&sz=w1000",
  "Burpee": "https://drive.google.com/thumbnail?id=1WJ2kHAB7bqHD-fVKNhZYoMs9S0sg9zPB&sz=w1000",
  "Jumping Jack": "https://drive.google.com/thumbnail?id=1-FlHLUqPkA5Vu-HcPGbYa0KaFng2ZJ1k&sz=w1000",
  "High Knee": "https://drive.google.com/thumbnail?id=1O5jDwBZwpyYwuvRLwFErSkVhTvWe7KIq&sz=w1000",
  "Butt Kicker": "https://drive.google.com/thumbnail?id=1ep19xplANPlJVunzH500CfggOCHRj3ob&sz=w1000",
  "Inchworm": "https://drive.google.com/thumbnail?id=1ZJ65kWoYJ-qyIrA2NOMgpQ5kcPfSUdB6&sz=w1000",
  "Bear Crawl": "https://drive.google.com/thumbnail?id=1FHYwfY-xAwJulLVzoyGsQghU-b-pxkuc&sz=w1000",
  "Box Jump": "https://drive.google.com/thumbnail?id=1o2XBNwydIUx1_gyNC3hfC54Pe4MiPlkz&sz=w1000",
  "Arm Circle": "https://drive.google.com/thumbnail?id=10SG2TmEgrSe-saQgtDRWvf9EoRsfiNJU&sz=w1000",
  "Hip Circle": "https://drive.google.com/thumbnail?id=1-zoFEYlvws8frKUNOz46aotZh7uegeQR&sz=w1000",
  "Cat-Cow": "https://drive.google.com/thumbnail?id=1R8JxRE2pW96hyrN6o01BAdhX5xZ3nirF&sz=w1000",
  "Quad Stretch": "https://drive.google.com/thumbnail?id=1vFmD1mYSrZeI6PdqOMKivyCK0CsvWAiW&sz=w1000",
  "Toe Touch": "https://drive.google.com/thumbnail?id=1hDqDNn9nm2FTH6SJCHdNpm67R-wrohbs&sz=w1000",
  "Standing Hamstring Stretch": "https://drive.google.com/thumbnail?id=14bEzJeKkmDdbdJ_vwTqR8Ss0BNUhd8nn&sz=w1000",
  "Hip Flexor Lunge Stretch": "https://drive.google.com/thumbnail?id=1OazPkvAwlMjLF8v94o__rmnxxecIDud7&sz=w1000",
  "Seated Butterfly Stretch": "https://drive.google.com/thumbnail?id=1vBCQXfgi3V4ELCEhs-Mh43Mvuwrjor9i&sz=w1000",
  "Chest Opener Stretch": "https://drive.google.com/thumbnail?id=1FicCCfxOno1wD_1zrwPByZ3c0HkEEubk&sz=w1000",
  "Neck Side Stretch": "https://drive.google.com/thumbnail?id=1p-um_wLixGO9f-XpmoNEaz-yYn7xmrrI&sz=w1000",
  "Child's Pose": "https://drive.google.com/thumbnail?id=19ngTSxp3CwMq1U2FwvOy7ULg1lztifz9&sz=w1000",
  "Pigeon Pose": "https://drive.google.com/thumbnail?id=1_qrrBA034xvGXlOfvWb8maFTcg4x46yB&sz=w1000",
  "World's Greatest Stretch": "https://drive.google.com/thumbnail?id=1hj1HrtRMB0w_K2e9WJGEs_sd6PMECw1I&sz=w1000",
  "Downward Dog": "https://drive.google.com/thumbnail?id=1Y-eY4BIuSCoMChju-T89cfktFrT6yxdQ&sz=w1000",
  "Seated Spinal Twist": "https://drive.google.com/thumbnail?id=12nKWxlJYD8nJfKpl6M6KQu5Y3SXoFCqi&sz=w1000",
  "Doorway Chest Stretch": "https://drive.google.com/thumbnail?id=1HLaMdd4rhypqhXE9jTMJpuBW3F1t6VwQ&sz=w1000",
  "Cobra Stretch": "https://drive.google.com/thumbnail?id=17wvzDeknvG4er4Gg4Or9OUnfOyYzK-Hu&sz=w1000",
  "Standing Quadriceps Stretch": "https://drive.google.com/thumbnail?id=1_PAtLcCw3IsiXCszPCxnD6w2z4VkJcVI&sz=w1000",
  "Shoulder Cross-Body Stretch": "https://drive.google.com/thumbnail?id=1V8nvGBjTHmDAdtOV31631Bka1CCeLQeZ&sz=w1000",
};


// Build step-by-step instructions + tips for a timed stretch from its "Cues:" text.
function stretchExtras(ex) {
  const desc = ex.description || "";
  const cues = (desc.split(/Cues:/i)[1] || "").trim();
  const instructions = cues
    ? cues.replace(/\.$/, "").split(/,\s+|\.\s+/).map(t => t.trim()).filter(Boolean)
        .map(t => t.charAt(0).toUpperCase() + t.slice(1))
    : [];
  const tips = [
    "Move slowly into the stretch and breathe steadily — never bounce or jerk.",
    "Stretch to gentle tension, not pain. Ease off if anything feels sharp.",
    "Hold for the full time, then repeat on the other side if it is one-sided.",
  ];
  const image_url = STRETCH_MEDIA[ex.name] || "";
  const video_url = STRETCH_VIDEO[ex.name] || "";
  const out = { instructions, tips };
  if (image_url) out.image_url = image_url;
  if (video_url) out.video_url = video_url;
  return out;
}

export default function ExerciseSeed() {
  const navigate       = useNavigate();
  const abortRef       = useRef(false);   // lets the user cancel mid-run

  const [dbNames,      setDbNames]      = useState([]);   // lowercased names in DB
  const [dbRecords,    setDbRecords]    = useState([]);   // full records (for repair)
  const [checking,     setChecking]     = useState(true);
  const [checkError,   setCheckError]   = useState(null);
  const [seeding,      setSeeding]      = useState(false);
  const [repairing,    setRepairing]    = useState(false);
  const [imageFilling, setImageFilling] = useState(false);
  const [currentName,  setCurrentName]  = useState("");
  const [log,          setLog]          = useState([]);
  const [done,         setDone]         = useState(false);

  useEffect(() => { checkDatabase(); }, []);

  // ── Check which exercises already exist ──────────────────────────────────
  const checkDatabase = async () => {
    setChecking(true);
    setCheckError(null);
    setLog([]);
    setDone(false);
    try {
      const data = await withTimeout(base44.entities.Exercise.list(), 15000);
      const live = (data || []).filter(e => !e.is_deleted);
      setDbRecords(live);
      setDbNames(live.map(e => (e.name || "").toLowerCase().trim()));
    } catch (err) {
      setCheckError(err.message || "Could not reach database.");
    }
    setChecking(false);
  };

  const missing = SEED_EXERCISES.filter(
    ex => !dbNames.includes(ex.name.toLowerCase().trim())
  );

  // ── Repair: existing records whose metric/target_time/category drifted ──────
  // Re-running the seed only CREATES missing records and never overwrites — so a
  // stretch already in the DB without metric:"time" stays invisible in the
  // Stretches library. This pass patches just those 3 fields on existing records.
  const findRec = (name) =>
    dbRecords.find(r => (r.name || "").toLowerCase().trim() === name.toLowerCase().trim());

  const needsRepair = SEED_EXERCISES.filter(seed => {
    if (!seed.metric) return false;
    const rec = findRec(seed.name);
    if (!rec) return false;
    const extras = stretchExtras(seed);
    const missingInstr = extras.instructions.length > 0 && (!rec.instructions || rec.instructions.length === 0);
    const missingImg = !!extras.image_url && !rec.image_url;
    const missingVid = !!extras.video_url && !rec.video_url && !rec.youtube_url;
    return rec.metric !== seed.metric
        || rec.target_time !== seed.target_time
        || rec.category !== seed.category
        || missingInstr
        || missingImg
        || missingVid;
  });

  const repairOne = async (seed) => {
    try {
      const rec = findRec(seed.name);
      if (!rec) return { ok: false, error: "not found" };
      const extras = stretchExtras(seed);
      const updates = {
        metric: seed.metric,
        target_time: seed.target_time,
        category: seed.category,
      };
      if (extras.instructions.length && (!rec.instructions || rec.instructions.length === 0)) {
        updates.instructions = extras.instructions;
        updates.tips = extras.tips;
      }
      if (extras.image_url && !rec.image_url) {
        updates.image_url = extras.image_url;
      }
      if (extras.video_url && !rec.video_url && !rec.youtube_url) {
        updates.video_url = extras.video_url;
      }
      await withTimeout(base44.entities.Exercise.update(rec.id, updates), 10000);
      setDbRecords(prev => prev.map(r => (r.id === rec.id ? { ...r, ...updates } : r)));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || "Unknown error" };
    }
  };

  const repairAll = async () => {
    if (needsRepair.length === 0) return;
    abortRef.current = false;
    setRepairing(true);
    setLog([]);
    setDone(false);
    const newLog = [];
    for (const seed of needsRepair) {
      if (abortRef.current) { newLog.push("⛔ Stopped by user."); setLog([...newLog]); break; }
      setCurrentName(seed.name);
      const r = await repairOne(seed);
      newLog.push(r.ok ? `🔧 ${seed.name}` : `❌ ${seed.name} — ${r.error}`);
      setLog([...newLog]);
      await new Promise(res => setTimeout(res, 350));
    }
    setCurrentName("");
    setRepairing(false);
    setDone(true);
    try { sessionStorage.removeItem("rns_exercises_cache"); } catch (_) {}
  };

  // ── Image fill: set image_url on any exercise that has a Drive photo but no image ──
  const needsImage = SEED_EXERCISES.filter(seed => {
    const url = EXERCISE_MEDIA[seed.name];
    if (!url) return false;
    const rec = findRec(seed.name);
    return rec && !rec.image_url;
  });

  const fillImagesAll = async () => {
    if (needsImage.length === 0) return;
    abortRef.current = false;
    setImageFilling(true);
    setLog([]);
    setDone(false);
    const newLog = [];
    for (const seed of needsImage) {
      if (abortRef.current) { newLog.push("⛔ Stopped by user."); setLog([...newLog]); break; }
      setCurrentName(seed.name);
      try {
        const rec = findRec(seed.name);
        await withTimeout(base44.entities.Exercise.update(rec.id, { image_url: EXERCISE_MEDIA[seed.name] }), 10000);
        setDbRecords(prev => prev.map(r => (r.id === rec.id ? { ...r, image_url: EXERCISE_MEDIA[seed.name] } : r)));
        newLog.push(`🖼️ ${seed.name}`);
      } catch (err) {
        newLog.push(`❌ ${seed.name} — ${err.message || "error"}`);
      }
      setLog([...newLog]);
      await new Promise(res => setTimeout(res, 300));
    }
    setCurrentName("");
    setImageFilling(false);
    setDone(true);
    try { sessionStorage.removeItem("rns_exercises_cache"); } catch (_) {}
  };

  // ── Create a single exercise with a hard timeout ─────────────────────────
  const createOne = async (ex) => {
    try {
      await withTimeout(
        base44.entities.Exercise.create({
          name:        ex.name,
          category:    ex.category,
          difficulty:  ex.difficulty,
          description: ex.description,
          ...(ex.metric ? { metric: ex.metric, target_time: ex.target_time, ...stretchExtras(ex) } : {}),
        }),
        10000   // 10-second hard timeout per exercise
      );
      setDbNames(prev => [...prev, ex.name.toLowerCase().trim()]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || "Unknown error" };
    }
  };

  // ── Seed all missing exercises ───────────────────────────────────────────
  const seedAll = async () => {
    if (missing.length === 0) return;
    abortRef.current = false;
    setSeeding(true);
    setLog([]);
    setDone(false);

    const newLog = [];

    for (const ex of missing) {
      if (abortRef.current) {
        newLog.push("⛔ Stopped by user.");
        setLog([...newLog]);
        break;
      }

      setCurrentName(ex.name);
      const result = await createOne(ex);

      newLog.push(
        result.ok
          ? `✅ ${ex.name}`
          : `❌ ${ex.name} — ${result.error}`
      );
      setLog([...newLog]);

      // Pause between calls — avoids hammering the API
      await new Promise(r => setTimeout(r, 350));
    }

    setCurrentName("");
    setSeeding(false);
    setDone(true);

    // Clear Exercises page cache so it reloads fresh
    try { sessionStorage.removeItem("rns_exercises_cache"); } catch (_) {}
  };

  const stopSeed = () => { abortRef.current = true; };

  // ── Render ────────────────────────────────────────────────────────────────
  const successCount = log.filter(l => l.startsWith("✅")).length;
  const failCount    = log.filter(l => l.startsWith("❌")).length;

  return (
    <div className="min-h-screen bg-[#020817] text-white pb-24">

      {/* Header */}
      <div className="bg-[#111] border-b border-gray-800 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(createPageUrl("Exercises"))} className="text-gray-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Dumbbell className="w-5 h-5 text-blue-400" />
        <div>
          <h1 className="text-base font-bold">Exercise Database Restore</h1>
          <p className="text-xs text-gray-500">Admin tool — restores missing exercise records</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Status / action card */}
        <div className="bg-[#111] border border-gray-700 rounded-xl p-5 space-y-4">

          {checking && (
            <div className="flex items-center gap-3 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-sm">Checking database…</span>
            </div>
          )}

          {checkError && (
            <div className="flex items-start gap-3 bg-red-950/40 border border-red-500/30 rounded-lg p-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-sm font-semibold">Could not reach database</p>
                <p className="text-red-400/70 text-xs mt-0.5">{checkError}</p>
                <button onClick={checkDatabase} className="text-blue-400 text-xs underline mt-2">Try again</button>
              </div>
            </div>
          )}

          {!checking && !checkError && (
            <>
              {/* Score */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">
                    {SEED_EXERCISES.length - missing.length} / {SEED_EXERCISES.length} exercises in database
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {missing.length === 0
                      ? "All exercises are present — nothing to restore."
                      : `${missing.length} exercise${missing.length !== 1 ? "s" : ""} missing.`}
                  </p>
                </div>
                <button onClick={checkDatabase} className="text-gray-600 hover:text-white ml-3">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((SEED_EXERCISES.length - missing.length) / SEED_EXERCISES.length) * 100}%` }}
                />
              </div>

              {/* Restore button */}
              {missing.length > 0 && !seeding && !repairing && !imageFilling && !done && (
                <Button onClick={seedAll} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-base">
                  Restore All {missing.length} Missing Exercises
                </Button>
              )}

              {/* Repair button — patches metric/target_time/category on existing stretch records */}
              {needsRepair.length > 0 && !seeding && !repairing && !done && (
                <div className="bg-amber-950/30 border border-amber-600/40 rounded-lg p-3 space-y-2">
                  <p className="text-amber-300 text-sm font-semibold">
                    {needsRepair.length} stretch{needsRepair.length !== 1 ? "es" : ""} need a quick fix
                  </p>
                  <p className="text-amber-400/70 text-xs">
                    These already exist but are missing the timed-stretch flag, so they do not show in the Stretches library. This patches them in place.
                  </p>
                  <Button onClick={repairAll} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5">
                    Fix {needsRepair.length} Stretch Record{needsRepair.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              )}

              {/* Image fill button — sets photos on exercises missing them */}
              {needsImage.length > 0 && !seeding && !repairing && !imageFilling && !done && (
                <div className="bg-cyan-950/30 border border-cyan-600/40 rounded-lg p-3 space-y-2">
                  <p className="text-cyan-300 text-sm font-semibold">
                    {needsImage.length} exercise{needsImage.length !== 1 ? "s" : ""} can get a photo
                  </p>
                  <p className="text-cyan-400/70 text-xs">
                    These have a photo available but no image set. This fills them in automatically.
                  </p>
                  <Button onClick={fillImagesAll} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5">
                    Add {needsImage.length} Missing Photo{needsImage.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              )}

              {imageFilling && (
                <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                    <p className="text-cyan-300 text-sm font-semibold truncate">Adding photo: {currentName}</p>
                  </div>
                  <p className="text-cyan-400/60 text-xs">{log.length} of {needsImage.length} processed</p>
                </div>
              )}

              {/* Active repair progress */}
              {repairing && (
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                    <p className="text-amber-300 text-sm font-semibold truncate">Fixing: {currentName}</p>
                  </div>
                  <p className="text-amber-400/60 text-xs">{log.length} of {needsRepair.length} processed</p>
                </div>
              )}

              {/* Active seeding progress */}
              {seeding && (
                <div className="space-y-3">
                  <div className="bg-blue-950/40 border border-blue-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                      <p className="text-blue-300 text-sm font-semibold truncate">Adding: {currentName}</p>
                    </div>
                    <p className="text-blue-400/60 text-xs">{log.length} of {missing.length} processed</p>
                  </div>
                  <button
                    onClick={stopSeed}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/50 text-red-400 text-sm hover:bg-red-950/30"
                  >
                    <StopCircle className="w-4 h-4" /> Stop
                  </button>
                </div>
              )}

              {/* Done */}
              {done && (
                <div className="bg-green-950/40 border border-green-500/30 rounded-lg p-4 space-y-3 text-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mx-auto" />
                  <p className="text-green-400 font-semibold">
                    Done — {successCount} added{failCount > 0 ? `, ${failCount} failed` : ""}
                  </p>
                  {failCount > 0 && (
                    <p className="text-yellow-400/80 text-xs">
                      {failCount} exercise{failCount !== 1 ? "s" : ""} failed. Scroll down to see which ones, then tap "Add" next to each one to retry individually.
                    </p>
                  )}
                  <Button
                    onClick={() => navigate(createPageUrl("Exercises"))}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    Go to Exercises →
                  </Button>
                  <button onClick={checkDatabase} className="text-gray-500 text-xs underline">Re-check database</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Live log */}
        {log.length > 0 && (
          <div className="bg-[#0d0d0d] border border-gray-800 rounded-xl p-4 max-h-48 overflow-y-auto space-y-0.5">
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">Log</p>
            {log.map((line, i) => (
              <p key={i} className={`text-xs font-mono leading-5 ${
                line.startsWith("✅") ? "text-green-400" :
                line.startsWith("🔧") ? "text-amber-400" :
                line.startsWith("🖼️") ? "text-cyan-400" :
                line.startsWith("⛔") ? "text-yellow-400" : "text-red-400"
              }`}>{line}</p>
            ))}
          </div>
        )}

        {/* Full exercise list */}
        {!checking && !checkError && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider px-1">
              All 51 Exercises
            </p>
            {SEED_EXERCISES.map((ex) => {
              const inDb = dbNames.includes(ex.name.toLowerCase().trim());
              return (
                <div
                  key={ex.name}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                    inDb
                      ? "bg-[#111] border-green-900/40"
                      : "bg-red-950/10 border-red-900/40"
                  }`}
                >
                  {inDb
                    ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    : <XCircle    className="w-4 h-4 text-red-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{ex.name}</p>
                    <p className="text-[11px] text-gray-500">{CAT_LABEL[ex.category] ?? ex.category}</p>
                  </div>
                  <span className={`text-[10px] border rounded-full px-2 py-0.5 font-semibold capitalize shrink-0 ${DIFF_COLOUR[ex.difficulty]}`}>
                    {ex.difficulty}
                  </span>
                  {!inDb && !seeding && (
                    <button
                      onClick={async () => {
                        setLog(prev => [...prev, `⏳ Adding ${ex.name}…`]);
                        const r = await createOne(ex);
                        setLog(prev => [
                          ...prev.filter(l => !l.includes(`Adding ${ex.name}`)),
                          r.ok ? `✅ ${ex.name}` : `❌ ${ex.name} — ${r.error}`
                        ]);
                        try { sessionStorage.removeItem("rns_exercises_cache"); } catch (_) {}
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 shrink-0 ml-1 font-semibold"
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Safety notice */}
        <div className="flex gap-3 bg-yellow-950/20 border border-yellow-800/30 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            Safe to run multiple times — skips exercises that already exist. Will never overwrite or delete existing records.
          </p>
        </div>

      </div>
    </div>
  );
}
