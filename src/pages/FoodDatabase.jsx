import React, { useState, useEffect } from "react";
import { Food } from "@/entities/Food";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import MobileDrawerSelect from "@/components/MobileDrawerSelect";
import { Search, Plus, Apple, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

const categoryConfig = {
  protein: { label: "Protein", color: "bg-red-500/20 text-red-400" },
  carbs: { label: "Carbs", color: "bg-yellow-500/20 text-yellow-400" },
  vegetables: { label: "Vegetables", color: "bg-green-500/20 text-green-400" },
  fruits: { label: "Fruits", color: "bg-orange-500/20 text-orange-400" },
  dairy: { label: "Dairy", color: "bg-blue-500/20 text-blue-400" },
  fats: { label: "Fats", color: "bg-purple-500/20 text-purple-400" },
  beverages: { label: "Beverages", color: "bg-cyan-500/20 text-cyan-400" },
  snacks: { label: "Snacks", color: "bg-pink-500/20 text-pink-400" },
  other: { label: "Other", color: "bg-gray-500/20 text-gray-400" }
};

export default function FoodDatabase() {
  const [foods, setFoods] = useState([]);
  const [filteredFoods, setFilteredFoods] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFood, setNewFood] = useState({
    name: "",
    category: "protein",
    serving_size: "100g",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    sugar: ""
  });

  useEffect(() => {
    loadFoods();
  }, []);

  useEffect(() => {
    let filtered = foods;
    if (selectedCategory !== "all") {
      filtered = filtered.filter(f => f.category === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredFoods(filtered);
  }, [foods, searchQuery, selectedCategory]);

  const loadFoods = async () => {
    setIsLoading(true);
    const data = await Food.list();
    const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
    setFoods(sorted);
    setIsLoading(false);
  };

  const handleAddFood = async () => {
    if (!newFood.name || !newFood.calories) return;
    
    await Food.create({
      ...newFood,
      calories: parseInt(newFood.calories),
      protein: parseInt(newFood.protein) || 0,
      carbs: parseInt(newFood.carbs) || 0,
      fat: parseInt(newFood.fat) || 0,
      fiber: parseInt(newFood.fiber) || 0,
      sugar: parseInt(newFood.sugar) || 0,
      is_custom: true
    });

    setNewFood({
      name: "",
      category: "protein",
      serving_size: "100g",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
      fiber: "",
      sugar: ""
    });
    setShowAddDialog(false);
    loadFoods();
  };

  const handleDeleteFood = async (foodId) => {
    if (confirm("Delete this food item?")) {
      await Food.delete(foodId);
      loadFoods();
    }
  };

  return (
    <div style={{ backgroundColor: '#020817', minHeight: '100vh', color: '#f9fafb' }}>
      {/* Header */}
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Link to={createPageUrl("Nutrition")}>
              <Button variant="ghost" size="icon" aria-label="Back to Nutrition" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Food Database</h1>
              <p className="text-white/80">Search or add foods to track</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Search and Filter */}
        <Card className="bg-card border-border mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search foods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background border-border"
                />
              </div>
              <div className="w-full md:w-48">
                <MobileDrawerSelect
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  options={[
                    { value: "all", label: "All Categories" },
                    ...Object.entries(categoryConfig).map(([key, config]) => ({
                      value: key,
                      label: config.label
                    }))
                  ]}
                  placeholder="Category"
                  label="Select Category"
                />
              </div>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="gradient-bg">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Food
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border text-white">
                  <DialogHeader>
                    <DialogTitle>Add New Food</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Food Name</Label>
                      <Input
                        value={newFood.name}
                        onChange={(e) => setNewFood({...newFood, name: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Category</Label>
                        <MobileDrawerSelect
                          value={newFood.category}
                          onValueChange={(v) => setNewFood({...newFood, category: v})}
                          options={Object.entries(categoryConfig).map(([key, config]) => ({
                            value: key,
                            label: config.label
                          }))}
                          placeholder="Select category"
                          label="Food Category"
                        />
                      </div>
                      <div>
                        <Label>Serving Size</Label>
                        <Input
                          value={newFood.serving_size}
                          onChange={(e) => setNewFood({...newFood, serving_size: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Calories *</Label>
                        <Input
                          type="number"
                          value={newFood.calories}
                          onChange={(e) => setNewFood({...newFood, calories: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <Label>Protein (g)</Label>
                        <Input
                          type="number"
                          value={newFood.protein}
                          onChange={(e) => setNewFood({...newFood, protein: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <Label>Carbs (g)</Label>
                        <Input
                          type="number"
                          value={newFood.carbs}
                          onChange={(e) => setNewFood({...newFood, carbs: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <Label>Fat (g)</Label>
                        <Input
                          type="number"
                          value={newFood.fat}
                          onChange={(e) => setNewFood({...newFood, fat: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddFood} className="w-full gradient-bg">
                      Add Food
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Food List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="p-4">
                  <div className="h-5 bg-gray-700 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredFoods.map(food => (
                <motion.div
                  key={food.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className="bg-card border-border hover:border-brand-blue/50 transition-colors group">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-white">{food.name}</h3>
                          <p className="text-sm text-gray-400">{food.serving_size}</p>
                        </div>
                        {food.is_custom && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteFood(food.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={categoryConfig[food.category]?.color || categoryConfig.other.color}>
                          {categoryConfig[food.category]?.label || "Other"}
                        </Badge>
                        {food.is_custom && (
                          <Badge variant="outline" className="border-brand-blue text-brand-blue">Custom</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-sm">
                        <div>
                          <div className="text-orange-400 font-semibold">{food.calories}</div>
                          <div className="text-gray-500 text-xs">cal</div>
                        </div>
                        <div>
                          <div className="text-red-400 font-semibold">{food.protein}g</div>
                          <div className="text-gray-500 text-xs">protein</div>
                        </div>
                        <div>
                          <div className="text-yellow-400 font-semibold">{food.carbs}g</div>
                          <div className="text-gray-500 text-xs">carbs</div>
                        </div>
                        <div>
                          <div className="text-blue-400 font-semibold">{food.fat}g</div>
                          <div className="text-gray-500 text-xs">fat</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filteredFoods.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Apple className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No foods found.</p>
            <p className="text-sm text-gray-600">Try adjusting your search or add a new food.</p>
          </div>
        )}
      </div>
    </div>
  );
}