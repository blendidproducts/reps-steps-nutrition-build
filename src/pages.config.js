/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIWorkoutGenerator from './pages/AIWorkoutGenerator';
import Achievements from './pages/Achievements';
import ActiveWorkout from './pages/ActiveWorkout';
import BodyMeasurements from './pages/BodyMeasurements';
import Community from './pages/Community';
import Disclaimer from './pages/Disclaimer';
import Exercises from './pages/Exercises';
import FoodDatabase from './pages/FoodDatabase';
import Help from './pages/Help';
import History from './pages/History';
import Home from './pages/Home';
import MealPlans from './pages/MealPlans';
import Nutrition from './pages/Nutrition';
import NutritionGoals from './pages/NutritionGoals';
import NutritionHistory from './pages/NutritionHistory';
import NutritionPrograms from './pages/NutritionPrograms';
import PresetPrograms from './pages/PresetPrograms';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import ProgramProgress from './pages/ProgramProgress';
import Programs from './pages/Programs';
import Progress from './pages/Progress';
import RandomWorkout from './pages/RandomWorkout';
import Referrals from './pages/Referrals';
import SavedWorkouts from './pages/SavedWorkouts';
import Settings from './pages/Settings';
import Stretches from './pages/Stretches';
import Terms from './pages/Terms';
import Upload3DModels from './pages/Upload3DModels';
import WatchMode from './pages/WatchMode';
import WorkoutBuilder from './pages/WorkoutBuilder';
import WorkoutComplete from './pages/WorkoutComplete';
import WorkoutDetail from './pages/WorkoutDetail';
import FitnessBrain from './pages/FitnessBrain';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIWorkoutGenerator": AIWorkoutGenerator,
    "Achievements": Achievements,
    "ActiveWorkout": ActiveWorkout,
    "BodyMeasurements": BodyMeasurements,
    "Community": Community,
    "Disclaimer": Disclaimer,
    "Exercises": Exercises,
    "FoodDatabase": FoodDatabase,
    "Help": Help,
    "History": History,
    "Home": Home,
    "MealPlans": MealPlans,
    "Nutrition": Nutrition,
    "NutritionGoals": NutritionGoals,
    "NutritionHistory": NutritionHistory,
    "NutritionPrograms": NutritionPrograms,
    "PresetPrograms": PresetPrograms,
    "Pricing": Pricing,
    "Privacy": Privacy,
    "ProgramProgress": ProgramProgress,
    "Programs": Programs,
    "Progress": Progress,
    "RandomWorkout": RandomWorkout,
    "Referrals": Referrals,
    "SavedWorkouts": SavedWorkouts,
    "Settings": Settings,
    "Stretches": Stretches,
    "Terms": Terms,
    "Upload3DModels": Upload3DModels,
    "WatchMode": WatchMode,
    "WorkoutBuilder": WorkoutBuilder,
    "WorkoutComplete": WorkoutComplete,
    "WorkoutDetail": WorkoutDetail,
    "FitnessBrain": FitnessBrain,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};