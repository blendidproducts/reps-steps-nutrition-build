import Home from './pages/Home';
import Exercises from './pages/Exercises';
import Settings from './pages/Settings';
import WorkoutBuilder from './pages/WorkoutBuilder';
import ActiveWorkout from './pages/ActiveWorkout';
import History from './pages/History';
import Help from './pages/Help';
import WorkoutComplete from './pages/WorkoutComplete';
import Pricing from './pages/Pricing';
import RandomWorkout from './pages/RandomWorkout';
import SavedWorkouts from './pages/SavedWorkouts';
import Programs from './pages/Programs';
import Progress from './pages/Progress';
import Nutrition from './pages/Nutrition';
import FoodDatabase from './pages/FoodDatabase';
import NutritionGoals from './pages/NutritionGoals';
import MealPlans from './pages/MealPlans';
import NutritionHistory from './pages/NutritionHistory';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Exercises": Exercises,
    "Settings": Settings,
    "WorkoutBuilder": WorkoutBuilder,
    "ActiveWorkout": ActiveWorkout,
    "History": History,
    "Help": Help,
    "WorkoutComplete": WorkoutComplete,
    "Pricing": Pricing,
    "RandomWorkout": RandomWorkout,
    "SavedWorkouts": SavedWorkouts,
    "Programs": Programs,
    "Progress": Progress,
    "Nutrition": Nutrition,
    "FoodDatabase": FoodDatabase,
    "NutritionGoals": NutritionGoals,
    "MealPlans": MealPlans,
    "NutritionHistory": NutritionHistory,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};