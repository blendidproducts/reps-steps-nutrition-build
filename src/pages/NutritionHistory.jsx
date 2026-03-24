import React, { useState, useEffect } from "react";
import { MealLog } from "@/entities/MealLog";
import { NutritionGoal } from "@/entities/NutritionGoal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MobileDrawerSelect from "@/components/MobileDrawerSelect";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, TrendingUp, Calendar } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function NutritionHistory() {
  const [mealLogs, setMealLogs] = useState([]);
  const [goal, setGoal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7");
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setIsLoading(true);
    const [logs, goals] = await Promise.all([
      MealLog.list('-date', 500),
      NutritionGoal.filter({ is_active: true })
    ]);
    
    setMealLogs(logs);
    if (goals.length > 0) setGoal(goals[0]);

    // Process data for chart
    const days = parseInt(timeRange);
    const dateMap = {};
    
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dateMap[date] = { date, calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    logs.forEach(log => {
      if (dateMap[log.date]) {
        dateMap[log.date].calories += log.calories || 0;
        dateMap[log.date].protein += log.protein || 0;
        dateMap[log.date].carbs += log.carbs || 0;
        dateMap[log.date].fat += log.fat || 0;
      }
    });

    const chartArray = Object.values(dateMap).map(d => ({
      ...d,
      displayDate: format(new Date(d.date), 'MMM d')
    }));

    setChartData(chartArray);
    setIsLoading(false);
  };

  const averages = chartData.length > 0 ? {
    calories: Math.round(chartData.reduce((sum, d) => sum + d.calories, 0) / chartData.length),
    protein: Math.round(chartData.reduce((sum, d) => sum + d.protein, 0) / chartData.length),
    carbs: Math.round(chartData.reduce((sum, d) => sum + d.carbs, 0) / chartData.length),
    fat: Math.round(chartData.reduce((sum, d) => sum + d.fat, 0) / chartData.length)
  } : { calories: 0, protein: 0, carbs: 0, fat: 0 };

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
              <h1 className="text-3xl font-bold">Nutrition History</h1>
              <p className="text-white/80">Track your progress over time</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Time Range Selector */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Progress Chart</h2>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="14">Last 14 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Averages */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{averages.calories}</div>
              <div className="text-sm text-gray-400">Avg Daily Calories</div>
              {goal && (
                <div className={`text-xs ${averages.calories > goal.daily_calories ? 'text-red-400' : 'text-green-400'}`}>
                  Goal: {goal.daily_calories}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{averages.protein}g</div>
              <div className="text-sm text-gray-400">Avg Daily Protein</div>
              {goal && (
                <div className={`text-xs ${averages.protein < goal.daily_protein ? 'text-yellow-400' : 'text-green-400'}`}>
                  Goal: {goal.daily_protein}g
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{averages.carbs}g</div>
              <div className="text-sm text-gray-400">Avg Daily Carbs</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{averages.fat}g</div>
              <div className="text-sm text-gray-400">Avg Daily Fat</div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-blue" />
              Calorie Intake
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="displayDate" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="calories" name="Calories" stroke="#f97316" strokeWidth={2} dot={false} />
                    {goal && (
                      <Line 
                        type="monotone" 
                        dataKey={() => goal.daily_calories} 
                        name="Goal" 
                        stroke="#22c55e" 
                        strokeWidth={1} 
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Macros Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white">Macronutrients</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="displayDate" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="protein" name="Protein (g)" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="carbs" name="Carbs (g)" stroke="#eab308" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="fat" name="Fat (g)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}