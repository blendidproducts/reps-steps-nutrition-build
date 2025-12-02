import React, { useState, useEffect } from "react";
import { MealLog } from "@/entities/MealLog";
import { NutritionGoal } from "@/entities/NutritionGoal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Apple, 
  Target, 
  TrendingUp, 
  Plus,
  Calendar,
  Utensils,
  Flame,
  Beef,
  Wheat,
  Droplets
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

import DailyNutritionSummary from "../components/nutrition/DailyNutritionSummary";
import MealList from "../components/nutrition/MealList";
import QuickAddFood from "../components/nutrition/QuickAddFood";

export default function Nutrition() {
  const [todaysMeals, setTodaysMeals] = useState([]);
  const [nutritionGoal, setNutritionGoal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [meals, goals] = await Promise.all([
      MealLog.filter({ date: today }),
      NutritionGoal.filter({ is_active: true })
    ]);
    setTodaysMeals(meals);
    if (goals.length > 0) {
      setNutritionGoal(goals[0]);
    }
    setIsLoading(false);
  };

  const totals = todaysMeals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.protein || 0),
    carbs: acc.carbs + (meal.carbs || 0),
    fat: acc.fat + (meal.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const handleFoodAdded = () => {
    loadData();
    setShowQuickAdd(false);
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      {/* Header */}
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Nutrition</h1>
              <p className="text-white/80">{format(new Date(), 'EEEE, MMMM d')}</p>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl("NutritionGoals")}>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  <Target className="w-4 h-4 mr-2" />
                  Goals
                </Button>
              </Link>
              <Link to={createPageUrl("MealPlans")}>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  <Calendar className="w-4 h-4 mr-2" />
                  Plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Daily Summary */}
        <DailyNutritionSummary 
          totals={totals} 
          goal={nutritionGoal} 
          isLoading={isLoading}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Button 
            onClick={() => setShowQuickAdd(true)}
            className="gradient-bg text-white h-auto py-4 flex flex-col items-center gap-2"
          >
            <Plus className="w-6 h-6" />
            <span>Log Food</span>
          </Button>
          <Link to={createPageUrl("FoodDatabase")} className="block">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 border-border hover:bg-card">
              <Apple className="w-6 h-6" />
              <span>Food Database</span>
            </Button>
          </Link>
          <Link to={createPageUrl("MealPlans")} className="block">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 border-border hover:bg-card">
              <Utensils className="w-6 h-6" />
              <span>Meal Plans</span>
            </Button>
          </Link>
          <Link to={createPageUrl("NutritionHistory")} className="block">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 border-border hover:bg-card">
              <TrendingUp className="w-6 h-6" />
              <span>History</span>
            </Button>
          </Link>
        </div>

        {/* Today's Meals */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Utensils className="w-5 h-5 text-brand-blue" />
              Today's Meals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MealList 
              meals={todaysMeals} 
              onMealDeleted={loadData}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <QuickAddFood 
          onClose={() => setShowQuickAdd(false)}
          onFoodAdded={handleFoodAdded}
          date={today}
        />
      )}
    </div>
  );
}