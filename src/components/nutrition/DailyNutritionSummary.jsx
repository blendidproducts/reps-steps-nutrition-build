import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Beef, Wheat, Droplets } from "lucide-react";

export default function DailyNutritionSummary({ totals, goal, isLoading }) {
  const defaultGoal = {
    daily_calories: 2000,
    daily_protein: 150,
    daily_carbs: 200,
    daily_fat: 65
  };

  const targets = goal || defaultGoal;

  const macros = [
    { 
      name: "Calories", 
      current: Math.round(totals.calories), 
      target: targets.daily_calories,
      icon: Flame,
      color: "text-orange-400",
      bgColor: "bg-orange-400"
    },
    { 
      name: "Protein", 
      current: Math.round(totals.protein), 
      target: targets.daily_protein,
      unit: "g",
      icon: Beef,
      color: "text-red-400",
      bgColor: "bg-red-400"
    },
    { 
      name: "Carbs", 
      current: Math.round(totals.carbs), 
      target: targets.daily_carbs,
      unit: "g",
      icon: Wheat,
      color: "text-yellow-400",
      bgColor: "bg-yellow-400"
    },
    { 
      name: "Fat", 
      current: Math.round(totals.fat), 
      target: targets.daily_fat,
      unit: "g",
      icon: Droplets,
      color: "text-blue-400",
      bgColor: "bg-blue-400"
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="bg-card border-border animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-700 rounded mb-2"></div>
              <div className="h-2 bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {macros.map((macro) => {
        const Icon = macro.icon;
        const percentage = Math.min((macro.current / macro.target) * 100, 100);
        const isOver = macro.current > macro.target;

        return (
          <Card key={macro.name} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${macro.color}`} />
                <span className="text-sm text-gray-400">{macro.name}</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {macro.current}
                {macro.unit && <span className="text-sm text-gray-400">{macro.unit}</span>}
                <span className="text-sm text-gray-500 font-normal"> / {macro.target}{macro.unit}</span>
              </div>
              <Progress 
                value={percentage} 
                className={`h-2 ${isOver ? '[&>div]:bg-red-500' : `[&>div]:${macro.bgColor}`}`}
              />
              <div className="text-xs text-gray-500 mt-1">
                {isOver ? (
                  <span className="text-red-400">{macro.current - macro.target}{macro.unit} over</span>
                ) : (
                  <span>{macro.target - macro.current}{macro.unit} remaining</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}