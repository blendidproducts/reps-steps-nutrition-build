/**
 * pages.config.js - Page routing configuration (lazy-loaded)
 * All page imports use React.lazy for code-splitting and faster initial load.
 */
import React from 'react';
import __Layout from './Layout.jsx';

// ── Critical path — preloaded immediately after initial render ───────────────
// These are the pages users are most likely to navigate to first.
const Home            = React.lazy(() => import(/* webpackPreload: true */ './pages/Home'));
const Exercises       = React.lazy(() => import(/* webpackPreload: true */ './pages/Exercises'));
const ActiveWorkout   = React.lazy(() => import(/* webpackPreload: true */ './pages/ActiveWorkout'));
const WorkoutBuilder  = React.lazy(() => import(/* webpackPreload: true */ './pages/WorkoutBuilder'));
const Nutrition       = React.lazy(() => import(/* webpackPreload: true */ './pages/Nutrition'));
const PresetPrograms  = React.lazy(() => import(/* webpackPreload: true */ './pages/PresetPrograms'));

// ── High-priority — prefetched during idle time ───────────────────────────────
const History         = React.lazy(() => import(/* webpackPrefetch: true */ './pages/History'));
const Settings        = React.lazy(() => import(/* webpackPrefetch: true */ './pages/Settings'));
const WorkoutComplete = React.lazy(() => import(/* webpackPrefetch: true */ './pages/WorkoutComplete'));
const FitnessBrain    = React.lazy(() => import(/* webpackPrefetch: true */ './pages/FitnessBrain'));
const Pricing         = React.lazy(() => import(/* webpackPrefetch: true */ './pages/Pricing'));
const Progress        = React.lazy(() => import(/* webpackPrefetch: true */ './pages/Progress'));
const SavedWorkouts   = React.lazy(() => import(/* webpackPrefetch: true */ './pages/SavedWorkouts'));

// ── Standard lazy — loaded on demand ─────────────────────────────────────────
const AIWorkoutGenerator  = React.lazy(() => import('./pages/AIWorkoutGenerator'));
const Achievements        = React.lazy(() => import('./pages/Achievements'));
const BodyMeasurements    = React.lazy(() => import('./pages/BodyMeasurements'));
const Community           = React.lazy(() => import('./pages/Community'));
const Disclaimer          = React.lazy(() => import('./pages/Disclaimer'));
const FoodDatabase        = React.lazy(() => import('./pages/FoodDatabase'));
const Help                = React.lazy(() => import('./pages/Help'));
const MealPlans           = React.lazy(() => import('./pages/MealPlans'));
const NutritionGoals      = React.lazy(() => import('./pages/NutritionGoals'));
const NutritionHistory    = React.lazy(() => import('./pages/NutritionHistory'));
const NutritionPrograms   = React.lazy(() => import('./pages/NutritionPrograms'));
const Privacy             = React.lazy(() => import('./pages/Privacy'));
const ProgramProgress     = React.lazy(() => import('./pages/ProgramProgress'));
const Programs            = React.lazy(() => import('./pages/Programs'));
const RandomWorkout       = React.lazy(() => import('./pages/RandomWorkout'));
const Referrals           = React.lazy(() => import('./pages/Referrals'));
const Stretches           = React.lazy(() => import('./pages/Stretches'));
const Terms               = React.lazy(() => import('./pages/Terms'));
const Upload3DModels      = React.lazy(() => import('./pages/Upload3DModels'));
const WatchMode           = React.lazy(() => import('./pages/WatchMode'));
const WorkoutDetail       = React.lazy(() => import('./pages/WorkoutDetail'));
const LinkMealBuilder     = React.lazy(() => import('./pages/LinkMealBuilder'));
const FoodPhotoAnalyzer   = React.lazy(() => import('./pages/FoodPhotoAnalyzer'));
const SmartWatchHub       = React.lazy(() => import('./pages/SmartWatchHub'));
const NutritionPricing    = React.lazy(() => import('./pages/NutritionPricing'));
const AddOns              = React.lazy(() => import('./pages/AddOns'));
const ARTPWorkout         = React.lazy(() => import('./pages/ARTPWorkout'));

export const PAGES = {
  "AIWorkoutGenerator":  AIWorkoutGenerator,
  "Achievements":        Achievements,
  "ActiveWorkout":       ActiveWorkout,
  "BodyMeasurements":    BodyMeasurements,
  "Community":           Community,
  "Disclaimer":          Disclaimer,
  "Exercises":           Exercises,
  "FitnessBrain":        FitnessBrain,
  "FoodDatabase":        FoodDatabase,
  "Help":                Help,
  "History":             History,
  "Home":                Home,
  "MealPlans":           MealPlans,
  "Nutrition":           Nutrition,
  "NutritionGoals":      NutritionGoals,
  "NutritionHistory":    NutritionHistory,
  "NutritionPrograms":   NutritionPrograms,
  "PresetPrograms":      PresetPrograms,
  "Pricing":             Pricing,
  "Privacy":             Privacy,
  "ProgramProgress":     ProgramProgress,
  "Programs":            Programs,
  "Progress":            Progress,
  "RandomWorkout":       RandomWorkout,
  "Referrals":           Referrals,
  "SavedWorkouts":       SavedWorkouts,
  "Settings":            Settings,
  "Stretches":           Stretches,
  "Terms":               Terms,
  "Upload3DModels":      Upload3DModels,
  "WatchMode":           WatchMode,
  "WorkoutBuilder":      WorkoutBuilder,
  "WorkoutComplete":     WorkoutComplete,
  "WorkoutDetail":       WorkoutDetail,
  "LinkMealBuilder":     LinkMealBuilder,
  "FoodPhotoAnalyzer":   FoodPhotoAnalyzer,
  "SmartWatchHub":       SmartWatchHub,
  "NutritionPricing":    NutritionPricing,
  "AddOns":              AddOns,
  "ARTPWorkout":         ARTPWorkout,
};

export const pagesConfig = {
  mainPage: "Home",
  Pages: PAGES,
  Layout: __Layout,
};