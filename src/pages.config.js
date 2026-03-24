/**
 * pages.config.js - Page routing configuration (lazy-loaded)
 * All page imports use React.lazy for code-splitting and faster initial load.
 */
import React from 'react';
import __Layout from './Layout.jsx';

const AIWorkoutGenerator  = React.lazy(() => import('./pages/AIWorkoutGenerator'));
const Achievements        = React.lazy(() => import('./pages/Achievements'));
const ActiveWorkout       = React.lazy(() => import('./pages/ActiveWorkout'));
const BodyMeasurements    = React.lazy(() => import('./pages/BodyMeasurements'));
const Community           = React.lazy(() => import('./pages/Community'));
const Disclaimer          = React.lazy(() => import('./pages/Disclaimer'));
const Exercises           = React.lazy(() => import('./pages/Exercises'));
const FitnessBrain        = React.lazy(() => import('./pages/FitnessBrain'));
const FoodDatabase        = React.lazy(() => import('./pages/FoodDatabase'));
const Help                = React.lazy(() => import('./pages/Help'));
const History             = React.lazy(() => import('./pages/History'));
const Home                = React.lazy(() => import('./pages/Home'));
const MealPlans           = React.lazy(() => import('./pages/MealPlans'));
const Nutrition           = React.lazy(() => import('./pages/Nutrition'));
const NutritionGoals      = React.lazy(() => import('./pages/NutritionGoals'));
const NutritionHistory    = React.lazy(() => import('./pages/NutritionHistory'));
const NutritionPrograms   = React.lazy(() => import('./pages/NutritionPrograms'));
const PresetPrograms      = React.lazy(() => import('./pages/PresetPrograms'));
const Pricing             = React.lazy(() => import('./pages/Pricing'));
const Privacy             = React.lazy(() => import('./pages/Privacy'));
const ProgramProgress     = React.lazy(() => import('./pages/ProgramProgress'));
const Programs            = React.lazy(() => import('./pages/Programs'));
const Progress            = React.lazy(() => import('./pages/Progress'));
const RandomWorkout       = React.lazy(() => import('./pages/RandomWorkout'));
const Referrals           = React.lazy(() => import('./pages/Referrals'));
const SavedWorkouts       = React.lazy(() => import('./pages/SavedWorkouts'));
const Settings            = React.lazy(() => import('./pages/Settings'));
const Stretches           = React.lazy(() => import('./pages/Stretches'));
const Terms               = React.lazy(() => import('./pages/Terms'));
const Upload3DModels      = React.lazy(() => import('./pages/Upload3DModels'));
const WatchMode           = React.lazy(() => import('./pages/WatchMode'));
const WorkoutBuilder      = React.lazy(() => import('./pages/WorkoutBuilder'));
const WorkoutComplete     = React.lazy(() => import('./pages/WorkoutComplete'));
const WorkoutDetail       = React.lazy(() => import('./pages/WorkoutDetail'));
const LinkMealBuilder     = React.lazy(() => import('./pages/LinkMealBuilder'));
const FoodPhotoAnalyzer   = React.lazy(() => import('./pages/FoodPhotoAnalyzer'));
const SmartWatchHub       = React.lazy(() => import('./pages/SmartWatchHub'));
const NutritionPricing    = React.lazy(() => import('./pages/NutritionPricing'));
const AddOns              = React.lazy(() => import('./pages/AddOns'));

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
};

export const pagesConfig = {
  mainPage: "Home",
  Pages: PAGES,
  Layout: __Layout,
};