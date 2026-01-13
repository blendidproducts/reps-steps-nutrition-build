import AIWorkoutGenerator from './pages/AIWorkoutGenerator';
import Achievements from './pages/Achievements';
import ActiveWorkout from './pages/ActiveWorkout';
import BodyMeasurements from './pages/BodyMeasurements';
import Exercises from './pages/Exercises';
import FoodDatabase from './pages/FoodDatabase';
import Help from './pages/Help';
import History from './pages/History';
import Home from './pages/Home';
import MealPlans from './pages/MealPlans';
import Nutrition from './pages/Nutrition';
import NutritionGoals from './pages/NutritionGoals';
import NutritionHistory from './pages/NutritionHistory';
import PresetPrograms from './pages/PresetPrograms';
import Pricing from './pages/Pricing';
import Programs from './pages/Programs';
import Progress from './pages/Progress';
import RandomWorkout from './pages/RandomWorkout';
import Referrals from './pages/Referrals';
import SavedWorkouts from './pages/SavedWorkouts';
import Settings from './pages/Settings';
import Stretches from './pages/Stretches';
import WorkoutBuilder from './pages/WorkoutBuilder';
import WorkoutComplete from './pages/WorkoutComplete';
import WorkoutDetail from './pages/WorkoutDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIWorkoutGenerator": AIWorkoutGenerator,
    "Achievements": Achievements,
    "ActiveWorkout": ActiveWorkout,
    "BodyMeasurements": BodyMeasurements,
    "Exercises": Exercises,
    "FoodDatabase": FoodDatabase,
    "Help": Help,
    "History": History,
    "Home": Home,
    "MealPlans": MealPlans,
    "Nutrition": Nutrition,
    "NutritionGoals": NutritionGoals,
    "NutritionHistory": NutritionHistory,
    "PresetPrograms": PresetPrograms,
    "Pricing": Pricing,
    "Programs": Programs,
    "Progress": Progress,
    "RandomWorkout": RandomWorkout,
    "Referrals": Referrals,
    "SavedWorkouts": SavedWorkouts,
    "Settings": Settings,
    "Stretches": Stretches,
    "WorkoutBuilder": WorkoutBuilder,
    "WorkoutComplete": WorkoutComplete,
    "WorkoutDetail": WorkoutDetail,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};