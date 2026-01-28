import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NutritionProgram } from "@/entities/NutritionProgram";
import { User } from "@/entities/User";
import { motion } from "framer-motion";
import { Flame, TrendingUp, DollarSign, Clock, Target, Utensils, Star, Lock } from "lucide-react";

export default function NutritionPrograms() {
  const [programs, setPrograms] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isPro, setIsPro] = React.useState(false);
  const [selectedProgram, setSelectedProgram] = React.useState(null);

  React.useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const user = await User.me();
      setIsPro(user.subscription_status === 'pro');
      
      const allPrograms = await NutritionProgram.list();
      setPrograms(allPrograms);
    } catch (error) {
      console.error('Failed to load programs:', error);
    }
    setLoading(false);
  };

  const getProgramIcon = (type) => {
    switch(type) {
      case 'weight_loss': return <Flame className="w-8 h-8" />;
      case 'muscle_gain': return <TrendingUp className="w-8 h-8" />;
      case 'budget_friendly': return <DollarSign className="w-8 h-8" />;
      default: return <Utensils className="w-8 h-8" />;
    }
  };

  const getProgramColor = (type) => {
    switch(type) {
      case 'weight_loss': return 'from-red-600 to-orange-600';
      case 'muscle_gain': return 'from-blue-600 to-purple-600';
      case 'budget_friendly': return 'from-green-600 to-emerald-600';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }} className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }} className="pb-20">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Nutrition Programs</h1>
          <p className="text-gray-400">Choose a meal plan that fits your goals</p>
        </div>

        {/* PRO Banner for Non-Pro Users */}
        {!isPro && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-600/10 border-2 border-yellow-500/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Lock className="w-12 h-12 text-yellow-400" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">PRO Feature</h3>
                    <p className="text-gray-300 text-sm">Unlock all nutrition programs with PRO</p>
                  </div>
                  <Link to={createPageUrl("Pricing")}>
                    <Button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:opacity-90 font-bold">
                      <Star className="w-4 h-4 mr-2" />
                      Upgrade to PRO
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program, index) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`bg-card border-border hover:shadow-xl transition-all duration-300 ${!isPro ? 'opacity-75' : 'hover:scale-[1.02] cursor-pointer'}`}
                onClick={() => isPro && setSelectedProgram(program)}>
                <CardHeader className={`bg-gradient-to-br ${getProgramColor(program.program_type)} text-white rounded-t-xl p-6`}>
                  <div className="flex items-center justify-between mb-3">
                    {getProgramIcon(program.program_type)}
                    {!isPro && <Lock className="w-5 h-5" />}
                  </div>
                  <CardTitle className="text-2xl font-bold">{program.name}</CardTitle>
                  <CardDescription className="text-white/90 mt-2">{program.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-brand-blue" />
                      <span>{program.duration_days} Day Program</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4 text-green-400" />
                      <span>{program.daily_calories_target} calories/day</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Utensils className="w-4 h-4 text-purple-400" />
                      <span>P: {program.daily_protein_grams}g | C: {program.daily_carbs_grams}g | F: {program.daily_fat_grams}g</span>
                    </div>
                  </div>

                  {program.tips && program.tips.length > 0 && (
                    <div className="border-t border-border pt-4 mb-4">
                      <p className="text-xs font-semibold text-gray-400 mb-2">Quick Tips:</p>
                      <ul className="text-xs text-gray-400 space-y-1">
                        {program.tips.slice(0, 2).map((tip, i) => (
                          <li key={i}>• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button 
                    className={`w-full ${isPro ? 'bg-brand-blue hover:bg-brand-blue-dark' : 'bg-gray-600 cursor-not-allowed'}`}
                    disabled={!isPro}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPro) setSelectedProgram(program);
                    }}
                  >
                    {isPro ? 'View Meal Plan' : 'PRO Only'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Program Detail Modal */}
        {selectedProgram && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setSelectedProgram(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-4xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="bg-card border-border">
                <CardHeader className={`bg-gradient-to-br ${getProgramColor(selectedProgram.program_type)} text-white p-6`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-3xl font-bold mb-2">{selectedProgram.name}</CardTitle>
                      <CardDescription className="text-white/90">{selectedProgram.description}</CardDescription>
                    </div>
                    <button 
                      onClick={() => setSelectedProgram(null)}
                      className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 max-h-[70vh] overflow-y-auto">
                  {/* Program Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                      <Clock className="w-6 h-6 mx-auto mb-2 text-brand-blue" />
                      <p className="text-2xl font-bold">{selectedProgram.duration_days}</p>
                      <p className="text-xs text-gray-400">Days</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                      <Target className="w-6 h-6 mx-auto mb-2 text-green-400" />
                      <p className="text-2xl font-bold">{selectedProgram.daily_calories_target}</p>
                      <p className="text-xs text-gray-400">Calories/Day</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                      <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                      <p className="text-2xl font-bold">{selectedProgram.daily_protein_grams}g</p>
                      <p className="text-xs text-gray-400">Protein</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                      <Utensils className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                      <p className="text-2xl font-bold">{selectedProgram.daily_meal_plans?.length || 0}</p>
                      <p className="text-xs text-gray-400">Meal Plans</p>
                    </div>
                  </div>

                  {/* Tips */}
                  {selectedProgram.tips && selectedProgram.tips.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xl font-bold mb-3">Program Tips</h3>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <ul className="space-y-2">
                          {selectedProgram.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-brand-blue mt-1">•</span>
                              <span className="text-gray-300">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Daily Meal Plans */}
                  <div>
                    <h3 className="text-xl font-bold mb-4">Daily Meal Plans</h3>
                    <div className="space-y-4">
                      {selectedProgram.daily_meal_plans?.map((day, dayIndex) => (
                        <div key={dayIndex} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-lg">{day.day_name}</h4>
                            <Badge className="bg-brand-blue">{day.total_calories} cal</Badge>
                          </div>
                          {day.notes && (
                            <p className="text-sm text-gray-400 mb-3 italic">{day.notes}</p>
                          )}
                          <div className="grid gap-3">
                            {day.meals?.map((meal, mealIndex) => (
                              <div key={mealIndex} className="bg-gray-900/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-semibold capitalize">{meal.meal_type}: {meal.meal_name}</h5>
                                  <span className="text-xs text-gray-400">{meal.calories} cal</span>
                                </div>
                                <p className="text-xs text-gray-400 mb-2">{meal.ingredients?.join(', ')}</p>
                                <div className="flex gap-3 text-xs text-gray-500">
                                  <span>P: {meal.protein}g</span>
                                  <span>C: {meal.carbs}g</span>
                                  <span>F: {meal.fat}g</span>
                                </div>
                                {meal.instructions && (
                                  <p className="text-xs text-gray-400 mt-2 italic">{meal.instructions}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}