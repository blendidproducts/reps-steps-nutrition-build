import ActiveWorkout from './pages/ActiveWorkout';
import Exercises from './pages/Exercises';
import FoodDatabase from './pages/FoodDatabase';
import Help from './pages/Help';
import History from './pages/History';
import Home from './pages/Home';
import MealPlans from './pages/MealPlans';
import Nutrition from './pages/Nutrition';
import NutritionGoals from './pages/NutritionGoals';
import NutritionHistory from './pages/NutritionHistory';
import Pricing from './pages/Pricing';
import Programs from './pages/Programs';
import Progress from './pages/Progress';
import RandomWorkout from './pages/RandomWorkout';
import SavedWorkouts from './pages/SavedWorkouts';
import Settings from './pages/Settings';
import WorkoutBuilder from './pages/WorkoutBuilder';
import WorkoutComplete from './pages/WorkoutComplete';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActiveWorkout": ActiveWorkout,
    "Exercises": Exercises,
    "FoodDatabase": FoodDatabase,
    "Help": Help,
    "History": History,
    "Home": Home,
    "MealPlans": MealPlans,
    "Nutrition": Nutrition,
    "NutritionGoals": NutritionGoals,
    "NutritionHistory": NutritionHistory,
    "Pricing": Pricing,
    "Programs": Programs,
    "Progress": Progress,
    "RandomWorkout": RandomWorkout,
    "SavedWorkouts": SavedWorkouts,
    "Settings": Settings,
    "WorkoutBuilder": WorkoutBuilder,
    "WorkoutComplete": WorkoutComplete,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};