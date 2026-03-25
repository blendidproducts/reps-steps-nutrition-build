import React from "react";
import { MealLog } from "@/entities/MealLog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Coffee, Sun, Moon, Cookie } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";

const mealTypeConfig = {
  breakfast: { icon: Coffee, label: "Breakfast", color: "bg-yellow-500/20 text-yellow-400" },
  lunch: { icon: Sun, label: "Lunch", color: "bg-orange-500/20 text-orange-400" },
  dinner: { icon: Moon, label: "Dinner", color: "bg-purple-500/20 text-purple-400" },
  snack: { icon: Cookie, label: "Snack", color: "bg-green-500/20 text-green-400" }
};

export default function MealList({ meals, onMealDeleted, isLoading }) {
  const { mutate } = useOptimisticMutation();

  const handleDelete = (mealId) => {
    if (confirm("Delete this meal entry?")) {
      mutate(
        () => MealLog.delete(mealId),
        () => onMealDeleted(mealId) // optimistic: remove from UI immediately
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-background rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No meals logged yet today.</p>
        <p className="text-sm">Tap "Log Food" to get started!</p>
      </div>
    );
  }

  // Group meals by type
  const mealsByType = meals.reduce((acc, meal) => {
    const type = meal.meal_type || 'snack';
    if (!acc[type]) acc[type] = [];
    acc[type].push(meal);
    return acc;
  }, {});

  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <div className="space-y-4">
      {mealOrder.map(mealType => {
        const typeMeals = mealsByType[mealType];
        if (!typeMeals || typeMeals.length === 0) return null;

        const config = mealTypeConfig[mealType];
        const Icon = config.icon;
        const typeTotal = typeMeals.reduce((sum, m) => sum + (m.calories || 0), 0);

        return (
          <div key={mealType}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-white">{config.label}</span>
              </div>
              <span className="text-sm text-gray-400">{typeTotal} cal</span>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {typeMeals.map((meal) => (
                  <motion.div
                    key={meal.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-background rounded-lg p-3 flex items-center justify-between group"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-white">{meal.food_name}</div>
                      <div className="text-sm text-gray-400 flex gap-3">
                        <span>{meal.calories} cal</span>
                        {meal.protein > 0 && <span>P: {meal.protein}g</span>}
                        {meal.carbs > 0 && <span>C: {meal.carbs}g</span>}
                        {meal.fat > 0 && <span>F: {meal.fat}g</span>}
                      </div>
                    </div>
                    {meal.servings && meal.servings !== 1 && (
                      <Badge variant="outline" className="mr-2">
                        {meal.servings}x
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleDelete(meal.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}