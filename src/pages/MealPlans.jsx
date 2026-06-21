import React, { useState, useEffect } from "react";
import { MealPlan } from "@/entities/MealPlan";
import { Food } from "@/entities/Food";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import MobileDrawerSelect from "@/components/MobileDrawerSelect";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Trash2, 
  CheckCircle,
  Utensils
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function MealPlans() {
  const [mealPlans, setMealPlans] = useState([]);
  const [foods, setFoods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    goal_type: "maintenance",
    meals: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [plans, foodList] = await Promise.all([
      MealPlan.list(),
      Food.list()
    ]);
    setMealPlans(plans);
    setFoods(foodList);
    setIsLoading(false);
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name) return;
    await MealPlan.create(newPlan);
    setShowCreateDialog(false);
    setNewPlan({ name: "", description: "", goal_type: "maintenance", meals: [] });
    loadData();
  };

  const handleDeletePlan = async (planId) => {
    if (confirm("Delete this meal plan?")) {
      await MealPlan.delete(planId);
      loadData();
    }
  };

  const handleActivatePlan = async (plan) => {
    // Deactivate all other plans
    for (const p of mealPlans) {
      if (p.is_active) {
        await MealPlan.update(p.id, { is_active: false });
      }
    }
    // Activate selected plan
    await MealPlan.update(plan.id, { is_active: true });
    loadData();
  };

  const addMealToPlan = (day, mealType, foodId, foodName) => {
    const newMeal = { day, meal_type: mealType, food_id: foodId, food_name: foodName, servings: 1 };
    setNewPlan({
      ...newPlan,
      meals: [...newPlan.meals, newMeal]
    });
  };

  const removeMealFromPlan = (index) => {
    setNewPlan({
      ...newPlan,
      meals: newPlan.meals.filter((_, i) => i !== index)
    });
  };

  return (
    <div style={{ backgroundColor: '#020817', minHeight: '100vh', color: '#f9fafb' }}>
      {/* Header */}
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Nutrition")}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Meal Plans</h1>
                <p className="text-white/80">Plan your weekly meals</p>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Meal Plan</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Plan Name</Label>
                    <Input
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                      placeholder="e.g., High Protein Week"
                      className="bg-background border-border"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newPlan.description}
                      onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                      placeholder="Describe your meal plan..."
                      className="bg-background border-border"
                    />
                  </div>
                  <div>
                    <Label>Goal Type</Label>
                    <MobileDrawerSelect
                      value={newPlan.goal_type}
                      onValueChange={(v) => setNewPlan({...newPlan, goal_type: v})}
                      options={[
                        { value: 'weight_loss', label: 'Weight Loss' },
                        { value: 'maintenance', label: 'Maintenance' },
                        { value: 'muscle_gain', label: 'Muscle Gain' },
                      ]}
                      placeholder="Select goal type"
                      label="Goal Type"
                    />
                  </div>

                  {/* Meal Builder */}
                  <div>
                    <Label>Add Meals</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <MobileDrawerSelect
                        value={newPlan._selectedDay || ""}
                        onValueChange={(v) => setNewPlan({...newPlan, _selectedDay: v})}
                        options={days.map(d => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))}
                        placeholder="Day"
                        label="Day"
                      />
                      <MobileDrawerSelect
                        value={newPlan._selectedMealType || ""}
                        onValueChange={(v) => setNewPlan({...newPlan, _selectedMealType: v})}
                        options={mealTypes.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))}
                        placeholder="Meal"
                        label="Meal Type"
                      />
                      <MobileDrawerSelect
                        value=""
                        onValueChange={(v) => {
                          const food = foods.find(f => f.id === v);
                          if (food && newPlan._selectedDay && newPlan._selectedMealType) {
                            addMealToPlan(newPlan._selectedDay, newPlan._selectedMealType, food.id, food.name);
                          }
                        }}
                        options={foods.map(f => ({ value: f.id, label: f.name }))}
                        placeholder="Food"
                        label="Food"
                      />
                    </div>
                  </div>

                  {/* Added Meals List */}
                  {newPlan.meals.length > 0 && (
                    <div className="border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
                      {newPlan.meals.map((meal, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div>
                            <span className="capitalize text-gray-400">{meal.day}</span>
                            <span className="mx-2 text-gray-600">•</span>
                            <span className="capitalize text-gray-400">{meal.meal_type}</span>
                            <span className="mx-2 text-gray-600">•</span>
                            <span className="text-white">{meal.food_name}</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeMealFromPlan(index)}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button onClick={handleCreatePlan} className="w-full gradient-bg" disabled={!newPlan.name}>
                    Create Plan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-700 rounded w-1/2 mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : mealPlans.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Meal Plans Yet</h3>
            <p className="text-gray-500 mb-4">Create your first meal plan to stay organized</p>
            <Button onClick={() => setShowCreateDialog(true)} className="gradient-bg">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Plan
            </Button>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {mealPlans.map(plan => (
                <motion.div
                  key={plan.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className={`bg-card border-border ${plan.is_active ? 'border-green-500' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            {plan.name}
                            {plan.is_active && (
                              <Badge className="bg-green-500/20 text-green-400">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </CardTitle>
                          {plan.description && (
                            <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleDeletePlan(plan.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="outline" className="capitalize">
                          {plan.goal_type?.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-gray-400">
                          {plan.meals?.length || 0} meals planned
                        </span>
                      </div>
                      
                      {!plan.is_active && (
                        <Button 
                          onClick={() => handleActivatePlan(plan)} 
                          className="w-full"
                          variant="outline"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Activate Plan
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}