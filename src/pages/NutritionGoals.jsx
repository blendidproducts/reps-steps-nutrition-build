import React, { useState, useEffect } from "react";
import { NutritionGoal } from "@/entities/NutritionGoal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Target, Calculator, Save, Zap } from "lucide-react";
import { motion } from "framer-motion";

const goalPresets = {
  weight_loss: {
    label: "Weight Loss",
    description: "Caloric deficit for fat loss",
    calorieMultiplier: 0.8,
    proteinMultiplier: 1.0,
    carbMultiplier: 0.8,
    fatMultiplier: 0.7
  },
  maintenance: {
    label: "Maintenance",
    description: "Maintain current weight",
    calorieMultiplier: 1.0,
    proteinMultiplier: 0.8,
    carbMultiplier: 1.0,
    fatMultiplier: 1.0
  },
  muscle_gain: {
    label: "Muscle Gain",
    description: "Caloric surplus for building muscle",
    calorieMultiplier: 1.15,
    proteinMultiplier: 1.2,
    carbMultiplier: 1.2,
    fatMultiplier: 1.0
  }
};

const activityLevels = {
  sedentary: { label: "Sedentary", multiplier: 1.2, description: "Little to no exercise" },
  light: { label: "Light", multiplier: 1.375, description: "1-3 days/week" },
  moderate: { label: "Moderate", multiplier: 1.55, description: "3-5 days/week" },
  active: { label: "Active", multiplier: 1.725, description: "6-7 days/week" },
  very_active: { label: "Very Active", multiplier: 1.9, description: "Intense daily training" }
};

export default function NutritionGoals() {
  const [currentGoal, setCurrentGoal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    goal_type: "maintenance",
    current_weight_lbs: "",
    target_weight_lbs: "",
    activity_level: "moderate",
    daily_calories: 2000,
    daily_protein: 150,
    daily_carbs: 200,
    daily_fat: 65
  });

  useEffect(() => {
    loadGoal();
  }, []);

  const loadGoal = async () => {
    setIsLoading(true);
    const goals = await NutritionGoal.filter({ is_active: true });
    if (goals.length > 0) {
      setCurrentGoal(goals[0]);
      setFormData({
        goal_type: goals[0].goal_type || "maintenance",
        current_weight_lbs: goals[0].current_weight_lbs || "",
        target_weight_lbs: goals[0].target_weight_lbs || "",
        activity_level: goals[0].activity_level || "moderate",
        daily_calories: goals[0].daily_calories || 2000,
        daily_protein: goals[0].daily_protein || 150,
        daily_carbs: goals[0].daily_carbs || 200,
        daily_fat: goals[0].daily_fat || 65
      });
    }
    setIsLoading(false);
  };

  const calculateMacros = () => {
    if (!formData.current_weight_lbs) return;

    const weight = parseFloat(formData.current_weight_lbs);
    const weightKg = weight * 0.453592;
    
    // Basic BMR calculation (Mifflin-St Jeor approximation)
    const bmr = 10 * weightKg + 6.25 * 170 - 5 * 30 + 5; // Assumes avg height/age
    const activityMultiplier = activityLevels[formData.activity_level]?.multiplier || 1.55;
    const tdee = bmr * activityMultiplier;

    const preset = goalPresets[formData.goal_type];
    const targetCalories = Math.round(tdee * preset.calorieMultiplier);
    const targetProtein = Math.round(weight * preset.proteinMultiplier);
    const targetCarbs = Math.round((targetCalories * 0.4) / 4 * preset.carbMultiplier);
    const targetFat = Math.round((targetCalories * 0.3) / 9 * preset.fatMultiplier);

    setFormData({
      ...formData,
      daily_calories: targetCalories,
      daily_protein: targetProtein,
      daily_carbs: targetCarbs,
      daily_fat: targetFat
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Deactivate existing goals
    if (currentGoal) {
      await NutritionGoal.update(currentGoal.id, { is_active: false });
    }

    // Create new goal
    await NutritionGoal.create({
      ...formData,
      current_weight_lbs: parseFloat(formData.current_weight_lbs) || null,
      target_weight_lbs: parseFloat(formData.target_weight_lbs) || null,
      is_active: true
    });

    setIsSaving(false);
    loadGoal();
  };

  if (isLoading) {
    return (
      <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }} className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      {/* Header */}
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Nutrition")}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Nutrition Goals</h1>
              <p className="text-white/80">Set your daily macro targets</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Goal Type Selection */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-brand-blue" />
              Your Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.goal_type}
              onValueChange={(v) => setFormData({...formData, goal_type: v})}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {Object.entries(goalPresets).map(([key, preset]) => (
                <div key={key}>
                  <RadioGroupItem value={key} id={key} className="peer sr-only" />
                  <Label
                    htmlFor={key}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-border bg-background p-4 hover:bg-gray-800 peer-data-[state=checked]:border-brand-blue peer-data-[state=checked]:bg-brand-blue/10 cursor-pointer transition-colors"
                  >
                    <span className="font-semibold text-white">{preset.label}</span>
                    <span className="text-xs text-gray-400 text-center mt-1">{preset.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Body Stats */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-brand-blue" />
              Your Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Current Weight (lbs)</Label>
                <Input
                  type="number"
                  value={formData.current_weight_lbs}
                  onChange={(e) => setFormData({...formData, current_weight_lbs: e.target.value})}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <Label>Target Weight (lbs)</Label>
                <Input
                  type="number"
                  value={formData.target_weight_lbs}
                  onChange={(e) => setFormData({...formData, target_weight_lbs: e.target.value})}
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div>
              <Label>Activity Level</Label>
              <Select value={formData.activity_level} onValueChange={(v) => setFormData({...formData, activity_level: v})}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(activityLevels).map(([key, level]) => (
                    <SelectItem key={key} value={key}>
                      {level.label} - {level.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={calculateMacros} variant="outline" className="w-full">
              <Zap className="w-4 h-4 mr-2" />
              Calculate Recommended Macros
            </Button>
          </CardContent>
        </Card>

        {/* Macro Targets */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-white">Daily Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-orange-400">Calories</Label>
                <Input
                  type="number"
                  value={formData.daily_calories}
                  onChange={(e) => setFormData({...formData, daily_calories: parseInt(e.target.value) || 0})}
                  className="bg-background border-border text-lg font-semibold"
                />
              </div>
              <div>
                <Label className="text-red-400">Protein (g)</Label>
                <Input
                  type="number"
                  value={formData.daily_protein}
                  onChange={(e) => setFormData({...formData, daily_protein: parseInt(e.target.value) || 0})}
                  className="bg-background border-border text-lg font-semibold"
                />
              </div>
              <div>
                <Label className="text-yellow-400">Carbs (g)</Label>
                <Input
                  type="number"
                  value={formData.daily_carbs}
                  onChange={(e) => setFormData({...formData, daily_carbs: parseInt(e.target.value) || 0})}
                  className="bg-background border-border text-lg font-semibold"
                />
              </div>
              <div>
                <Label className="text-blue-400">Fat (g)</Label>
                <Input
                  type="number"
                  value={formData.daily_fat}
                  onChange={(e) => setFormData({...formData, daily_fat: parseInt(e.target.value) || 0})}
                  className="bg-background border-border text-lg font-semibold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full gradient-bg text-lg py-6" disabled={isSaving}>
          <Save className="w-5 h-5 mr-2" />
          {isSaving ? "Saving..." : "Save Goals"}
        </Button>
      </div>
    </div>
  );
}