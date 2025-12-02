import React, { useState, useEffect } from "react";
import { MealLog } from "@/entities/MealLog";
import { Food } from "@/entities/Food";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus } from "lucide-react";

export default function QuickAddFood({ onClose, onFoodAdded, date }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [foods, setFoods] = useState([]);
  const [filteredFoods, setFilteredFoods] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [mealType, setMealType] = useState("lunch");
  const [servings, setServings] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Manual entry state
  const [manualEntry, setManualEntry] = useState({
    food_name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: ""
  });

  useEffect(() => {
    loadFoods();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = foods.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFoods(filtered);
    } else {
      setFilteredFoods(foods.slice(0, 10));
    }
  }, [searchQuery, foods]);

  const loadFoods = async () => {
    const data = await Food.list();
    setFoods(data);
    setFilteredFoods(data.slice(0, 10));
  };

  const handleSelectFood = (food) => {
    setSelectedFood(food);
    setServings(1);
  };

  const handleLogFood = async () => {
    if (!selectedFood) return;
    setIsLoading(true);

    await MealLog.create({
      date,
      meal_type: mealType,
      food_id: selectedFood.id,
      food_name: selectedFood.name,
      servings,
      calories: Math.round(selectedFood.calories * servings),
      protein: Math.round(selectedFood.protein * servings),
      carbs: Math.round(selectedFood.carbs * servings),
      fat: Math.round(selectedFood.fat * servings)
    });

    setIsLoading(false);
    onFoodAdded();
  };

  const handleManualLog = async () => {
    if (!manualEntry.food_name || !manualEntry.calories) return;
    setIsLoading(true);

    await MealLog.create({
      date,
      meal_type: mealType,
      food_name: manualEntry.food_name,
      servings: 1,
      calories: parseInt(manualEntry.calories) || 0,
      protein: parseInt(manualEntry.protein) || 0,
      carbs: parseInt(manualEntry.carbs) || 0,
      fat: parseInt(manualEntry.fat) || 0
    });

    setIsLoading(false);
    onFoodAdded();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Log Food</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <Label>Meal Type</Label>
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="search">
          <TabsList className="grid w-full grid-cols-2 bg-background">
            <TabsTrigger value="search">Search Foods</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search foods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredFoods.map(food => (
                <div
                  key={food.id}
                  onClick={() => handleSelectFood(food)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedFood?.id === food.id 
                      ? 'bg-brand-blue/20 border border-brand-blue' 
                      : 'bg-background hover:bg-gray-800'
                  }`}
                >
                  <div className="font-medium">{food.name}</div>
                  <div className="text-sm text-gray-400">
                    {food.calories} cal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                  </div>
                </div>
              ))}
              {filteredFoods.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No foods found. Try manual entry.
                </div>
              )}
            </div>

            {selectedFood && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <Label>Servings</Label>
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={servings}
                      onChange={(e) => setServings(parseFloat(e.target.value) || 1)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Total</div>
                    <div className="text-xl font-bold text-brand-blue">
                      {Math.round(selectedFood.calories * servings)} cal
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleLogFood} 
                  className="w-full gradient-bg"
                  disabled={isLoading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isLoading ? "Adding..." : "Add to Log"}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div>
              <Label>Food Name</Label>
              <Input
                placeholder="e.g., Grilled Chicken Breast"
                value={manualEntry.food_name}
                onChange={(e) => setManualEntry({...manualEntry, food_name: e.target.value})}
                className="bg-background border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Calories</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={manualEntry.calories}
                  onChange={(e) => setManualEntry({...manualEntry, calories: e.target.value})}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <Label>Protein (g)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={manualEntry.protein}
                  onChange={(e) => setManualEntry({...manualEntry, protein: e.target.value})}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <Label>Carbs (g)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={manualEntry.carbs}
                  onChange={(e) => setManualEntry({...manualEntry, carbs: e.target.value})}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <Label>Fat (g)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={manualEntry.fat}
                  onChange={(e) => setManualEntry({...manualEntry, fat: e.target.value})}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <Button 
              onClick={handleManualLog} 
              className="w-full gradient-bg"
              disabled={isLoading || !manualEntry.food_name || !manualEntry.calories}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isLoading ? "Adding..." : "Add to Log"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}