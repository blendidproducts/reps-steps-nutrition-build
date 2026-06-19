import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Play, Timer, ChevronDown, ChevronUp, X, SkipForward, RotateCcw } from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "upper_body", label: "Upper Body" },
  { id: "lower_body", label: "Lower Body" },
  { id: "core", label: "Core" },
  { id: "full_body", label: "Full Body" },
  { id: "mobility", label: "Mobility" },
];

const STRETCH_PROGRAMS = [
  {
    id: "beginner",
    name: "Beginner Flexibility Foundation",
    description: "Gentle 7-day routine to build baseline flexibility",
    duration_days: 7,
    difficulty: "beginner",
    color: "from-green-600 to-emerald-700",
    stretches: [
      { name: "Standing Hamstring Stretch", hold: 30, sets: 2 },
      { name: "Hip Flexor Lunge Stretch", hold: 30, sets: 2 },
      { name: "Seated Butterfly Stretch", hold: 30, sets: 2 },
      { name: "Chest Opener Stretch", hold: 20, sets: 2 },
      { name: "Neck Side Stretch", hold: 20, sets: 2 },
      { name: "Child's Pose", hold: 45, sets: 2 },
    ]
  },
  {
    id: "intermediate",
    name: "Intermediate Mobility Flow",
    description: "10-day deep-tissue mobility program",
    duration_days: 10,
    difficulty: "intermediate",
    color: "from-blue-600 to-indigo-700",
    stretches: [
      { name: "Pigeon Pose", hold: 45, sets: 2 },
      { name: "World's Greatest Stretch", hold: 30, sets: 3 },
      { name: "Downward Dog", hold: 40, sets: 3 },
      { name: "Seated Spinal Twist", hold: 30, sets: 2 },
      { name: "Figure-4 Glute Stretch", hold: 40, sets: 2 },
      { name: "Doorway Chest Stretch", hold: 30, sets: 3 },
      { name: "Hip Flexor Lunge Stretch", hold: 45, sets: 3 },
    ]
  },
  {
    id: "advanced",
    name: "Advanced Performance Recovery",
    description: "14-day advanced program for athletes",
    duration_days: 14,
    difficulty: "advanced",
    color: "from-red-600 to-orange-700",
    stretches: [
      { name: "Pigeon Pose", hold: 60, sets: 3 },
      { name: "World's Greatest Stretch", hold: 45, sets: 3 },
      { name: "Cobra Stretch", hold: 60, sets: 3 },
      { name: "Supine Spinal Twist", hold: 60, sets: 3 },
      { name: "Standing Quadriceps Stretch", hold: 45, sets: 3 },
      { name: "Shoulder Cross-Body Stretch", hold: 45, sets: 3 },
      { name: "Downward Dog", hold: 60, sets: 3 },
      { name: "Seated Butterfly Stretch", hold: 60, sets: 3 },
    ]
  },
  {
    id: "mobility-extras",
    name: "Mobility Extras",
    description: "Targeted stretches for grip, IT band, lats, and wrists not covered by the core programs",
    duration_days: 7,
    difficulty: "beginner",
    color: "from-teal-600 to-cyan-700",
    stretches: [
      { name: "Calf Stretch (wall)", hold: 30, sets: 2 },
      { name: "IT Band Stretch", hold: 30, sets: 2 },
      { name: "Thread the Needle", hold: 30, sets: 2 },
      { name: "Seated Forward Fold", hold: 30, sets: 2 },
      { name: "Overhead Lat Stretch", hold: 30, sets: 2 },
      { name: "Overhead Tricep Stretch", hold: 30, sets: 2 },
      { name: "Knees to Chest", hold: 30, sets: 2 },
      { name: "Forearm Stretch", hold: 20, sets: 2 },
    ]
  }
];

// Built-in stretch library — shown so the Stretches page always has content
// even before the Exercise DB is seeded. DB records (incl. uploaded photos)
// take precedence; these fill in anything the DB is missing.
const STRETCH_LIBRARY = [
  { id: "lib-arm-circle", name: "Arm Circle", category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Full shoulder rotation warm-up. Muscles: Shoulders, Rotator Cuff. Cues: Make large circles, raise arm fully overhead each revolution.", instructions: ["Make large circles", "Raise arm fully overhead each revolution"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=10SG2TmEgrSe-saQgtDRWvf9EoRsfiNJU&sz=w1000&sz=w1000", },
  { id: "lib-hip-circle", name: "Hip Circle", category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Standing hip rotation. Muscles: Hip Flexors, Glutes. Cues: Full circular motion, keep feet planted, rotate both directions.", instructions: ["Full circular motion", "Keep feet planted", "Rotate both directions"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1-zoFEYlvws8frKUNOz46aotZh7uegeQR&sz=w1000&sz=w1000", },
  { id: "lib-cat-cow", name: "Cat-Cow", category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Spinal flexion and extension on all fours. Muscles: Spine, Core. Cues: Exhale arch (cat), inhale sag (cow), slow and controlled.", instructions: ["Exhale arch (cat)", "Inhale sag (cow)", "Slow and controlled"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1R8JxRE2pW96hyrN6o01BAdhX5xZ3nirF&sz=w1000&sz=w1000", },
  { id: "lib-quad-stretch", name: "Quad Stretch", category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Standing quad and hip flexor stretch. Muscles: Quadriceps, Hip Flexors. Cues: Pull foot to glute, keep knees together, stand tall.", instructions: ["Pull foot to glute", "Keep knees together", "Stand tall"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1vFmD1mYSrZeI6PdqOMKivyCK0CsvWAiW&sz=w1000&sz=w1000", },
  { id: "lib-toe-touch", name: "Toe Touch", category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Standing hamstring stretch. Muscles: Hamstrings, Lower Back. Cues: Straight legs, reach for toes, slow stretch.", instructions: ["Straight legs", "Reach for toes", "Slow stretch"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1hDqDNn9nm2FTH6SJCHdNpm67R-wrohbs&sz=w1000&sz=w1000", },
  { id: "lib-calf-stretch-wall", name: "Calf Stretch (wall)", category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Wall-supported calf and Achilles stretch. Muscles: Calves, Achilles. Cues: Back leg straight with heel pressed down, lean into the wall, hold without bouncing.", instructions: ["Back leg straight with heel pressed down", "Lean into the wall", "Hold without bouncing"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], },
  { id: "lib-it-band-stretch", name: "IT Band Stretch", category: "mobility", difficulty: "intermediate", metric: "time", target_time: 30, description: "Standing or seated outer-thigh and IT band stretch. Muscles: IT Band, Outer Hip, Glutes. Cues: Cross one leg in front of the other, lean gently to the side, hold without bouncing.", instructions: ["Cross one leg in front of the other", "Lean gently to the side", "Hold without bouncing"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], },
  { id: "lib-thread-the-needle", name: "Thread the Needle", category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Spinal rotation stretch from a quadruped position. Muscles: Upper Back, Shoulders, Spine. Cues: Thread one arm under the body, rest the shoulder and head on the floor, breathe into the stretch.", instructions: ["Thread one arm under the body", "Rest the shoulder and head on the floor", "Breathe into the stretch"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], },
  { id: "lib-seated-forward-fold", name: "Seated Forward Fold", category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Seated hamstring and lower back stretch. Muscles: Hamstrings, Lower Back. Cues: Hinge at the hips with a long spine, reach toward the toes, avoid rounding the lower back forcefully.", instructions: ["Hinge at the hips with a long spine", "Reach toward the toes", "Avoid rounding the lower back forcefully"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], },
  { id: "lib-overhead-lat-stretch", name: "Overhead Lat Stretch", category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Standing lat and side-body stretch. Muscles: Lats, Obliques, Shoulders. Cues: Reach one arm overhead and lean to the opposite side, keep the hips square and facing forward.", instructions: ["Reach one arm overhead and lean to the opposite side", "Keep the hips square and facing forward"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], },
  { id: "lib-overhead-tricep-stretch", name: "Overhead Tricep Stretch", category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Standing tricep and shoulder stretch. Muscles: Triceps, Shoulders. Cues: Bend one elbow overhead, gently pull the elbow with the opposite hand, keep the chest lifted.", instructions: ["Bend one elbow overhead", "Gently pull the elbow with the opposite hand", "Keep the chest lifted"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], },
  { id: "lib-knees-to-chest", name: "Knees to Chest", category: "mobility", difficulty: "beginner", metric: "time", target_time: 30, description: "Supine lower-back release stretch. Muscles: Lower Back, Glutes, Hips. Cues: Pull both knees toward the chest, relax the shoulders flat on the floor, breathe slowly.", instructions: ["Pull both knees toward the chest", "Relax the shoulders flat on the floor", "Breathe slowly"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], },
  { id: "lib-forearm-stretch", name: "Forearm Stretch", category: "mobility", difficulty: "beginner", metric: "time", target_time: 20, description: "Wrist and forearm flexor/extensor stretch. Muscles: Forearms, Wrists. Cues: Extend the arm with palm up, gently pull the fingers back toward the body, then flip the hand over for the top-of-forearm stretch.", instructions: ["Extend the arm with palm up", "Gently pull the fingers back toward the body", "Then flip the hand over for the top-of-forearm stretch"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], },
  { id: "lib-standing-hamstring-stretch", name: "Standing Hamstring Stretch", category: "lower_body", difficulty: "beginner", metric: "time", target_time: 30, description: "Standing forward reach targeting the hamstrings. Muscles: Hamstrings, Calves. Cues: Slight knee bend, hinge at the hips, reach toward the toes, keep the back straight.", instructions: ["Slight knee bend", "Hinge at the hips", "Reach toward the toes", "Keep the back straight"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=18ZjCtVhfWtD2FD35z4gn-ZDHLBJ_Gz9F&sz=w1000&sz=w1000", },
  { id: "lib-hip-flexor-lunge-stretch", name: "Hip Flexor Lunge Stretch", category: "lower_body", difficulty: "beginner", metric: "time", target_time: 30, description: "Kneeling lunge stretch for the front hip. Muscles: Hip Flexors, Quadriceps. Cues: Back knee down, push the hips forward gently, keep the torso upright.", instructions: ["Back knee down", "Push the hips forward gently", "Keep the torso upright"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1OazPkvAwlMjLF8v94o__rmnxxecIDud7&sz=w1000&sz=w1000", },
  { id: "lib-seated-butterfly-stretch", name: "Seated Butterfly Stretch", category: "lower_body", difficulty: "beginner", metric: "time", target_time: 30, description: "Seated inner-thigh stretch with soles of the feet together. Muscles: Inner Thighs, Hips. Cues: Sit tall, let the knees drop toward the floor, gently press the knees down for more stretch.", instructions: ["Sit tall", "Let the knees drop toward the floor", "Gently press the knees down for more stretch"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1vBCQXfgi3V4ELCEhs-Mh43Mvuwrjor9i&sz=w1000&sz=w1000", },
  { id: "lib-chest-opener-stretch", name: "Chest Opener Stretch", category: "upper_body", difficulty: "beginner", metric: "time", target_time: 20, description: "Standing chest and shoulder opener with hands clasped behind the back. Muscles: Chest, Shoulders. Cues: Clasp hands behind the back, lift the chest, draw the shoulder blades together.", instructions: ["Clasp hands behind the back", "Lift the chest", "Draw the shoulder blades together"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1FicCCfxOno1wD_1zrwPByZ3c0HkEEubk&sz=w1000&sz=w1000", },
  { id: "lib-neck-side-stretch", name: "Neck Side Stretch", category: "upper_body", difficulty: "beginner", metric: "time", target_time: 20, description: "Lateral neck stretch for tension relief. Muscles: Neck, Upper Traps. Cues: Tilt the head gently to one side, use the hand for light overpressure, keep the shoulders relaxed.", instructions: ["Tilt the head gently to one side", "Use the hand for light overpressure", "Keep the shoulders relaxed"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1p-um_wLixGO9f-XpmoNEaz-yYn7xmrrI&sz=w1000&sz=w1000", },
  { id: "lib-child-s-pose", name: "Child's Pose", category: "full_body", difficulty: "beginner", metric: "time", target_time: 45, description: "Kneeling forward fold stretching the back and shoulders. Muscles: Lower Back, Lats, Hips. Cues: Sit the hips back toward the heels, reach the arms forward, relax the head down.", instructions: ["Sit the hips back toward the heels", "Reach the arms forward", "Relax the head down"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=19ngTSxp3CwMq1U2FwvOy7ULg1lztifz9&sz=w1000&sz=w1000", },
  { id: "lib-pigeon-pose", name: "Pigeon Pose", category: "lower_body", difficulty: "intermediate", metric: "time", target_time: 45, description: "Deep hip and glute opener. Muscles: Glutes, Hip Rotators. Cues: Front shin angled forward, back leg extended straight, square the hips, fold forward gently.", instructions: ["Front shin angled forward", "Back leg extended straight", "Square the hips", "Fold forward gently"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1_qrrBA034xvGXlOfvWb8maFTcg4x46yB&sz=w1000&sz=w1000", },
  { id: "lib-world-s-greatest-stretch", name: "World's Greatest Stretch", category: "full_body", difficulty: "intermediate", metric: "time", target_time: 30, description: "Dynamic multi-plane lunge and rotation stretch. Muscles: Hips, Hamstrings, Spine, Shoulders. Cues: Step into a lunge, drop the back hand down, rotate the opposite arm toward the ceiling, move smoothly between positions.", instructions: ["Step into a lunge", "Drop the back hand down", "Rotate the opposite arm toward the ceiling", "Move smoothly between positions"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1hj1HrtRMB0w_K2e9WJGEs_sd6PMECw1I&sz=w1000&sz=w1000", },
  { id: "lib-downward-dog", name: "Downward Dog", category: "full_body", difficulty: "intermediate", metric: "time", target_time: 40, description: "Inverted V stretch for the posterior chain. Muscles: Hamstrings, Calves, Shoulders, Back. Cues: Press the hips up and back, straighten the legs as much as comfortable, press through the hands.", instructions: ["Press the hips up and back", "Straighten the legs as much as comfortable", "Press through the hands"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1Y-eY4BIuSCoMChju-T89cfktFrT6yxdQ&sz=w1000&sz=w1000", },
  { id: "lib-seated-spinal-twist", name: "Seated Spinal Twist", category: "core", difficulty: "intermediate", metric: "time", target_time: 30, description: "Seated rotational stretch for the spine and obliques. Muscles: Spine, Obliques, Lower Back. Cues: Sit tall, rotate the torso toward the back leg, use the arm for gentle leverage, keep the hips square.", instructions: ["Sit tall", "Rotate the torso toward the back leg", "Use the arm for gentle leverage", "Keep the hips square"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=12nKWxlJYD8nJfKpl6M6KQu5Y3SXoFCqi&sz=w1000&sz=w1000", },
  { id: "lib-figure-4-glute-stretch", name: "Figure-4 Glute Stretch", category: "lower_body", difficulty: "intermediate", metric: "time", target_time: 40, description: "Supine or seated glute and piriformis stretch. Muscles: Glutes, Piriformis, Hips. Cues: Cross one ankle over the opposite knee, gently pull the thigh toward the chest, keep the crossed foot flexed.", instructions: ["Cross one ankle over the opposite knee", "Gently pull the thigh toward the chest", "Keep the crossed foot flexed"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], },
  { id: "lib-doorway-chest-stretch", name: "Doorway Chest Stretch", category: "upper_body", difficulty: "intermediate", metric: "time", target_time: 30, description: "Chest and front-shoulder stretch using a doorway or wall. Muscles: Chest, Front Deltoids, Biceps. Cues: Forearm on the frame at shoulder height, gently rotate the body away, keep the elbow slightly below shoulder height.", instructions: ["Forearm on the frame at shoulder height", "Gently rotate the body away", "Keep the elbow slightly below shoulder height"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1HLaMdd4rhypqhXE9jTMJpuBW3F1t6VwQ&sz=w1000&sz=w1000", },
  { id: "lib-cobra-stretch", name: "Cobra Stretch", category: "core", difficulty: "advanced", metric: "time", target_time: 60, description: "Prone backbend opening the front body. Muscles: Abs, Lower Back, Hip Flexors. Cues: Press through the hands, lift the chest while keeping the hips down, ease into the range without forcing.", instructions: ["Press through the hands", "Lift the chest while keeping the hips down", "Ease into the range without forcing"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=17wvzDeknvG4er4Gg4Or9OUnfOyYzK-Hu&sz=w1000&sz=w1000", },
  { id: "lib-supine-spinal-twist", name: "Supine Spinal Twist", category: "core", difficulty: "advanced", metric: "time", target_time: 60, description: "Lying rotational stretch for the spine and glutes. Muscles: Spine, Glutes, Obliques. Cues: Lie on the back, drop both knees to one side, keep the shoulders flat on the floor, breathe into the stretch.", instructions: ["Lie on the back", "Drop both knees to one side", "Keep the shoulders flat on the floor", "Breathe into the stretch"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], },
  { id: "lib-standing-quadriceps-stretch", name: "Standing Quadriceps Stretch", category: "lower_body", difficulty: "advanced", metric: "time", target_time: 45, description: "Standing front-thigh stretch. Muscles: Quadriceps, Hip Flexors. Cues: Pull the heel toward the glutes, keep the knees together, stand tall and use support if needed.", instructions: ["Pull the heel toward the glutes", "Keep the knees together", "Stand tall and use support if needed"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1_PAtLcCw3IsiXCszPCxnD6w2z4VkJcVI&sz=w1000&sz=w1000", },
  { id: "lib-shoulder-cross-body-stretch", name: "Shoulder Cross-Body Stretch", category: "upper_body", difficulty: "advanced", metric: "time", target_time: 45, description: "Cross-body stretch for the rear shoulder. Muscles: Rear Deltoids, Upper Back. Cues: Pull one arm across the chest, use the opposite arm for gentle pressure, keep the shoulder down away from the ear.", instructions: ["Pull one arm across the chest", "Use the opposite arm for gentle pressure", "Keep the shoulder down away from the ear"], tips: ["Move slowly into the stretch and breathe steadily — never bounce or jerk.", "Stretch to gentle tension, not pain. Ease off if anything feels sharp.", "Hold for the full time, then repeat on the other side if it is one-sided."], image_url: "https://drive.google.com/thumbnail?id=https://drive.google.com/thumbnail?id=1V8nvGBjTHmDAdtOV31631Bka1CCeLQeZ&sz=w1000&sz=w1000", },
];

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
}

function ActiveSession({ stretches, onClose }) {
  const [idx, setIdx] = useState(0);
  const [set, setSet] = useState(1);
  const [phase, setPhase] = useState("stretch"); // stretch | rest
  const [timeLeft, setTimeLeft] = useState(stretches[0]?.hold || 30);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Web Audio beeps for the timer (no asset files needed)
  const armAudio = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    } catch (_) {}
  };
  const beep = (freq = 880, dur = 0.12, vol = 0.18) => {
    try {
      const ctx = audioCtxRef.current; if (!ctx) return;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq; gain.gain.value = vol;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.stop(ctx.currentTime + dur);
    } catch (_) {}
  };

  const current = stretches[idx];
  const currentImg = (STRETCH_LIBRARY.find(s => s.name.toLowerCase() === (current?.name || "").toLowerCase()) || {}).image_url;
  const totalSets = current?.sets || 2;
  const restTime = 10;

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            beep(phase === "rest" ? 988 : 660, 0.4, 0.25); // transition tone
            handleNext();
            return 0;
          }
          if (t <= 4) beep(880, 0.08, 0.14); // last few-second ticks
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, idx, set, phase]);

  const handleNext = () => {
    clearInterval(timerRef.current);
    if (phase === "stretch") {
      if (set < totalSets) {
        setPhase("rest");
        setTimeLeft(restTime);
      } else {
        if (idx + 1 < stretches.length) {
          setIdx(i => i + 1);
          setSet(1);
          setPhase("stretch");
          setTimeLeft(stretches[idx + 1]?.hold || 30);
        } else {
          setIsRunning(false);
          setPhase("done");
        }
      }
    } else {
      setSet(s => s + 1);
      setPhase("stretch");
      setTimeLeft(current?.hold || 30);
    }
    setIsRunning(true);
  };

  const progress = phase === "stretch"
    ? ((current?.hold - timeLeft) / current?.hold) * 100
    : ((restTime - timeLeft) / restTime) * 100;

  const isDone = phase === "done";

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-bold text-lg">Active Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {isDone ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-white text-2xl font-bold mb-2">Session Complete!</h3>
            <p className="text-gray-400 mb-6">Great job! You completed all stretches.</p>
            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700 text-white">Done</Button>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Stretch {idx + 1} of {stretches.length}</span>
              <span>Set {set} of {totalSets}</span>
            </div>
            <Progress value={(idx / stretches.length) * 100} className="h-1.5 mb-6" />

            {/* Current stretch */}
            <Card className="bg-gray-900 border-gray-700 mb-6">
              <CardContent className="p-6 text-center">
                <Badge className={phase === "rest" ? "bg-yellow-600 mb-3" : "bg-blue-600 mb-3"}>
                  {phase === "rest" ? "REST" : "HOLD"}
                </Badge>
                <h3 className="text-white text-xl font-bold mb-2">
                  {phase === "rest" ? "Rest & Breathe" : current?.name}
                </h3>
                {phase === "rest" && (
                  <p className="text-gray-400 text-sm mb-3">
                    Next: {current?.name} — Set {set + 1}
                  </p>
                )}

                {phase !== "rest" && currentImg && (
                  <img
                    src={currentImg}
                    alt={current?.name}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    className="w-32 h-32 mx-auto rounded-xl object-cover border border-gray-700 mb-3"
                  />
                )}

                {/* Timer circle */}
                <div className="relative w-36 h-36 mx-auto mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#374151" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={phase === "rest" ? "#d97706" : "#3b82f6"}
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-3xl font-bold">{timeLeft}</span>
                  </div>
                </div>

                <Progress value={progress} className="h-2 mb-4" />
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex gap-3">
              <Button onClick={() => { armAudio(); setIsRunning(r => !r); }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12">
                {isRunning ? "Pause" : <><Play className="w-4 h-4 mr-2" />Start</>}
              </Button>
              <Button onClick={handleNext} variant="outline"
                className="border-gray-600 text-white hover:bg-gray-800 h-12 px-4">
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Stretches() {
  const [exercises, setExercises] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("library"); // library | programs
  const [expandedProgram, setExpandedProgram] = useState(null);
  const [activeSession, setActiveSession] = useState(null); // array of stretch objects
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    let result = exercises;
    if (category !== "all") result = result.filter(e => e.category === category);
    if (search) result = result.filter(e => e.name?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [exercises, category, search]);

  const loadExercises = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.Exercise.filter({ metric: "time" });
      const dbList = Array.isArray(data) ? data : [];
      const have = new Set(dbList.map(e => (e.name || "").toLowerCase().trim()));
      const merged = [...dbList, ...STRETCH_LIBRARY.filter(s => !have.has(s.name.toLowerCase().trim()))];
      setExercises(merged.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } catch (e) {
      console.error("Failed to load Stretches data:", e);
      setExercises([...STRETCH_LIBRARY].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } finally {
      setIsLoading(false);
    }
  };

  const startProgram = (program) => {
    setActiveSession(program.stretches.map(s => ({ name: s.name, hold: s.hold, sets: s.sets })));
  };

  const startLibraryStretch = (exercise) => {
    setActiveSession([{ name: exercise.name, hold: exercise.target_time || 30, sets: 3 }]);
  };

  const difficultyColor = {
    beginner: "bg-green-600",
    intermediate: "bg-yellow-600",
    advanced: "bg-red-600",
  };

  return (
    <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#f9fafb", paddingBottom: "100px" }}>
      {/* Active Session Overlay */}
      {activeSession && (
        <ActiveSession stretches={activeSession} onClose={() => setActiveSession(null)} />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Timer className="w-6 h-6" /> Stretching & Flexibility
          </h1>
          <p className="text-white/80 text-sm">Browse stretches or follow a guided program</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-5">
        {/* Tabs */}
        <div className="flex bg-white/5 rounded-xl p-1 gap-1 mb-5">
          {["library", "programs"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
              }`}>
              {tab === "library" ? "Stretch Library" : "Programs"}
            </button>
          ))}
        </div>

        {/* LIBRARY TAB */}
        {activeTab === "library" && (
          <>
            <div className="flex flex-col gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search stretches..."
                  className="pl-9 bg-gray-900 border-gray-700 text-white" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      category === c.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Timer className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No stretches found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(exercise => (
                  <motion.div key={exercise.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="bg-gray-900 border-gray-700 hover:border-blue-500/50 transition-all cursor-pointer"
                      onClick={() => setSelectedExercise(selectedExercise?.id === exercise.id ? null : exercise)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          {exercise.image_url && (
                            <img
                              src={exercise.image_url}
                              alt={exercise.name}
                              loading="lazy"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-700 mr-3 shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-sm truncate">{exercise.name}</h3>
                            <p className="text-gray-400 text-xs mt-0.5">{exercise.description}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <Badge className="bg-blue-600/30 text-blue-300 text-xs">
                              {exercise.target_time || 30}s
                            </Badge>
                            <Button onClick={e => { e.stopPropagation(); startLibraryStretch(exercise); }}
                              size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3">
                              <Play className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {selectedExercise?.id === exercise.id && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="mt-3 pt-3 border-t border-gray-700">
                                {exercise.instructions?.length > 0 && (
                                  <ol className="space-y-1 mb-3">
                                    {exercise.instructions.map((step, i) => (
                                      <li key={i} className="text-gray-300 text-xs flex gap-2">
                                        <span className="text-blue-400 font-bold shrink-0">{i+1}.</span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                                {exercise.tips?.length > 0 && (
                                  <div className="bg-blue-500/10 rounded-lg p-3">
                                    <p className="text-blue-400 text-xs font-semibold mb-1">Tips</p>
                                    {exercise.tips.map((tip, i) => (
                                      <p key={i} className="text-gray-300 text-xs">• {tip}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* PROGRAMS TAB */}
        {activeTab === "programs" && (
          <div className="space-y-4">
            {STRETCH_PROGRAMS.map(program => (
              <Card key={program.id} className="bg-gray-900 border-gray-700 overflow-hidden">
                <div className={`bg-gradient-to-r ${program.color} p-4`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-bold text-base">{program.name}</h3>
                      <p className="text-white/80 text-xs mt-0.5">{program.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge className={`${difficultyColor[program.difficulty]} text-white text-xs`}>
                          {program.difficulty}
                        </Badge>
                        <Badge className="bg-white/20 text-white text-xs">
                          {program.duration_days} days
                        </Badge>
                        <Badge className="bg-white/20 text-white text-xs">
                          {program.stretches.length} stretches
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <button onClick={() => setExpandedProgram(expandedProgram === program.id ? null : program.id)}
                    className="flex items-center gap-2 text-gray-400 text-xs hover:text-white mb-3 transition-colors">
                    {expandedProgram === program.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedProgram === program.id ? "Hide stretches" : "Preview stretches"}
                  </button>

                  <AnimatePresence>
                    {expandedProgram === program.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
                        <div className="space-y-2">
                          {program.stretches.map((s, i) => (
                            <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                              <span className="text-gray-200 text-sm">{i+1}. {s.name}</span>
                              <span className="text-gray-400 text-xs">{s.hold}s × {s.sets}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button onClick={() => startProgram(program)}
                    className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold">
                    <Play className="w-4 h-4 mr-2" /> Start Program
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}