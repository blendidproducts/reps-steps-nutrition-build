import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MealLog } from "@/entities/MealLog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import {
  Camera, Upload, ArrowLeft, Loader2, CheckCircle,
  Flame, Beef, Wheat, Droplets, Plus, X, RefreshCw
} from "lucide-react";
import { useNutritionPlan } from "@/hooks/useNutritionPlan";
import NutritionUpgradeGate from "@/components/nutrition/NutritionUpgradeGate";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export default function FoodPhotoAnalyzer() {
  const navigate = useNavigate();
  const { plan, loading: planLoading, hasAiAddon } = useNutritionPlan();
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null); // base64 preview
  const [imageFile, setImageFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [logDate, setLogDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setResult(null);
    setError("");
    setLogged(false);
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setAnalyzing(true);
    setError("");
    setResult(null);
    try {
      // Upload the image first
      const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });

      // Ask the LLM to analyze the food photo
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional nutritionist and food recognition AI. 
Analyze this food photo and identify all food items visible.
For each food item, estimate realistic serving sizes and nutritional values.
Then provide total combined macros for the entire meal in the photo.
Be specific and realistic — base estimates on standard nutritional databases.
If you can't identify something clearly, make a reasonable estimate.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            meal_name: { type: "string", description: "Short descriptive name for the whole meal" },
            description: { type: "string", description: "What you see in the photo" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
            foods_detected: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  estimated_serving: { type: "string" },
                  calories: { type: "number" },
                  protein: { type: "number" },
                  carbs: { type: "number" },
                  fat: { type: "number" }
                }
              }
            },
            total_calories: { type: "number" },
            total_protein: { type: "number" },
            total_carbs: { type: "number" },
            total_fat: { type: "number" },
            total_fiber: { type: "number" },
            health_notes: { type: "string", description: "Brief nutrition quality note" },
            suggested_meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] }
          }
        }
      });

      setResult(analysis);
      if (analysis.suggested_meal_type) setMealType(analysis.suggested_meal_type);
    } catch (e) {
      setError("Could not analyze the photo. Please try a clearer image.");
    }
    setAnalyzing(false);
  };

  const handleLog = async () => {
    if (!result) return;
    setLogging(true);
    await MealLog.create({
      date: logDate,
      meal_type: mealType,
      food_name: result.meal_name || "Photo Meal",
      calories: Math.round(result.total_calories || 0),
      protein: Math.round(result.total_protein || 0),
      carbs: Math.round(result.total_carbs || 0),
      fat: Math.round(result.total_fat || 0),
      servings: 1,
    });
    setLogged(true);
    setLogging(false);
  };

  const reset = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError("");
    setLogged(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const CONFIDENCE_COLORS = { low: "text-red-400", medium: "text-yellow-400", high: "text-green-400" };

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ color: "#f9fafb", backgroundColor: "transparent" }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-5 px-4">

        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(createPageUrl("Nutrition"))} className="text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Camera className="w-5 h-5" /> AI Food Analyzer
            </h1>
            <p className="text-white/80 text-xs mt-0.5">Photo your meal — AI estimates calories & macros instantly</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Upload Area */}
        <Card className="bg-white/5 border-white/10 overflow-hidden">
          <CardContent className="p-0">
            {image ? (
              <div className="relative">
                <img src={image} alt="Food" className="w-full max-h-72 object-cover rounded-xl" />
                <button onClick={reset}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-52 flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-gray-300 hover:bg-white/5 transition-all rounded-xl border-2 border-dashed border-white/20 hover:border-orange-500/50"
              >
                <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center">
                  <Camera className="w-8 h-8 text-orange-400" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm text-white">Take or upload a photo</div>
                  <div className="text-xs text-gray-500 mt-0.5">JPG, PNG, HEIC supported</div>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full">📷 Camera</span>
                  <span className="text-xs bg-white/10 text-gray-400 border border-white/20 px-3 py-1 rounded-full">📁 Gallery</span>
                </div>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Analyze Button */}
        {image && !result && (
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-3.5 rounded-xl text-base gap-2"
          >
            {analyzing
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing food...</>
              : <><Camera className="w-5 h-5" /> Analyze with AI</>
            }
          </Button>
        )}

        {/* Analyzing state */}
        {analyzing && (
          <div className="text-center py-6">
            <div className="text-4xl mb-3 animate-bounce">🍽️</div>
            <p className="text-gray-300 font-medium">AI is identifying your food...</p>
            <p className="text-gray-500 text-sm mt-1">Estimating calories and macros</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
            <span>{error}</span>
            <button onClick={reset} className="ml-auto"><RefreshCw className="w-4 h-4" /></button>
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Meal Name + Confidence */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">{result.meal_name}</h2>
                <p className="text-gray-400 text-sm">{result.description}</p>
              </div>
              <Badge className={`capitalize text-xs ${CONFIDENCE_COLORS[result.confidence]} bg-white/5 border border-white/10`}>
                {result.confidence} confidence
              </Badge>
            </div>

            {/* Macro Summary */}
            <Card className="bg-gradient-to-br from-orange-900/40 to-amber-900/40 border-orange-500/30">
              <CardContent className="p-5">
                <div className="text-center mb-4">
                  <div className="text-5xl font-bold text-white">{Math.round(result.total_calories)}</div>
                  <div className="text-orange-300 text-sm font-medium mt-0.5">total calories</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Beef, label: "Protein", value: result.total_protein, color: "#ef4444" },
                    { icon: Wheat, label: "Carbs", value: result.total_carbs, color: "#eab308" },
                    { icon: Droplets, label: "Fat", value: result.total_fat, color: "#3b82f6" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-black/20 rounded-xl p-3 text-center">
                      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                      <div className="text-white font-bold">{Math.round(value || 0)}g</div>
                      <div className="text-gray-500 text-xs">{label}</div>
                    </div>
                  ))}
                </div>
                {result.total_fiber > 0 && (
                  <div className="text-center mt-3 text-gray-500 text-xs">Fiber: {Math.round(result.total_fiber)}g</div>
                )}
              </CardContent>
            </Card>

            {/* Individual Foods */}
            {result.foods_detected?.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <h3 className="text-white font-medium text-sm mb-3">🔍 Foods Detected</h3>
                  <div className="space-y-2">
                    {result.foods_detected.map((food, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div>
                          <div className="text-white text-sm font-medium">{food.name}</div>
                          <div className="text-gray-500 text-xs">{food.estimated_serving}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-orange-400 text-sm font-bold">{food.calories} kcal</div>
                          <div className="text-gray-500 text-xs">{food.protein}P · {food.carbs}C · {food.fat}F</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Health Note */}
            {result.health_notes && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-blue-300 text-sm">
                💡 {result.health_notes}
              </div>
            )}

            {/* Log to Meal Tracker */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-white font-medium text-sm">Log to Meal Tracker</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Meal Type</label>
                    <div className="grid grid-cols-2 gap-1">
                      {MEAL_TYPES.map(t => (
                        <button key={t} onClick={() => setMealType(t)}
                          className={`py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${mealType === t ? "bg-orange-600/30 border-orange-500 text-orange-300" : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Date</label>
                    <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-400" />
                  </div>
                </div>

                {logged ? (
                  <div className="bg-green-600 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-bold">
                    <CheckCircle className="w-5 h-5" /> Logged to {mealType}!
                  </div>
                ) : (
                  <Button onClick={handleLog} disabled={logging}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl gap-2">
                    {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {logging ? "Logging..." : `Add ${Math.round(result.total_calories)} kcal to ${mealType}`}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Analyze Another */}
            <button onClick={reset} className="w-full py-3 text-gray-400 hover:text-white text-sm flex items-center justify-center gap-2 transition-colors">
              <RefreshCw className="w-4 h-4" /> Analyze another photo
            </button>
          </>
        )}
      </div>
    </div>
  );
}