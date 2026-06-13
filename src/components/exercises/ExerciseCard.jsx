
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, HelpCircle, Zap, Target, Users } from "lucide-react";

const categoryColors = {
  upper_body: "bg-red-900/50 text-red-300 border-red-500/30",
  lower_body: "bg-sky-900/50 text-sky-300 border-sky-500/30", 
  core: "bg-yellow-900/50 text-yellow-300 border-yellow-500/30",
  cardio: "bg-green-900/50 text-green-300 border-green-500/30",
  full_body: "bg-purple-900/50 text-purple-300 border-purple-500/30"
};

const difficultyColors = {
  beginner: "bg-emerald-900/50 text-emerald-300 border-emerald-500/30",
  intermediate: "bg-amber-900/50 text-amber-300 border-amber-500/30",
  advanced: "bg-rose-900/50 text-rose-300 border-rose-500/30"
};

const difficultyIcons = {
  beginner: Target,
  intermediate: Zap,
  advanced: Users
};

export default function ExerciseCard({ exercise, isSelected, onSelect, onShowHelp }) {
  const DifficultyIcon = difficultyIcons[exercise.difficulty] || Target;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card className={`h-full border-2 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 bg-card ${
        isSelected ? 'border-brand-blue' : 'border-border'
      }`}>
        <CardContent className="p-3 md:p-4">
          <div className="relative mb-3">
            <div className="w-full h-24 md:h-32 bg-background rounded-lg flex items-center justify-center overflow-hidden">
              {exercise.image_url ? (
                <img src={exercise.image_url} alt={exercise.name} className="w-full h-full object-contain" />
              ) : (
                <DifficultyIcon className="w-8 h-8 md:w-12 md:h-12 text-brand" />
              )}
            </div>
            <button
              onClick={(e) => {e.stopPropagation(); onShowHelp();}}
              className="absolute top-1 right-1 w-6 h-6 bg-card/80 hover:bg-card rounded-full flex items-center justify-center shadow-md transition-colors touch-manipulation"
            >
              <HelpCircle className="w-3 h-3 text-gray-300" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <h3 className="text-sm md:text-base font-bold text-foreground mb-1 line-clamp-2 leading-tight">{exercise.name}</h3>
              <p className="text-gray-400 text-xs line-clamp-2 leading-tight">{exercise.description}</p>
            </div>

            <div className="flex gap-1 flex-wrap">
              <Badge variant="outline" className={`${categoryColors[exercise.category] || "bg-gray-700 text-gray-300"} text-xs px-1 py-0`}>
                {exercise.category?.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={`${difficultyColors[exercise.difficulty] || "bg-gray-700 text-gray-300"} text-xs px-1 py-0`}>
                <DifficultyIcon className="w-2 h-2 mr-1" />
                {exercise.difficulty}
              </Badge>
            </div>

            {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
              <div className="text-xs text-gray-400">
                <strong>Targets:</strong> {exercise.muscle_groups.slice(0, 2).join(', ')}
                {exercise.muscle_groups.length > 2 && ` +${exercise.muscle_groups.length - 2}`}
              </div>
            )}

            <Button
              onClick={onSelect}
              variant={isSelected ? "default" : "outline"}
              className={`w-full transition-all duration-300 touch-manipulation py-2 text-xs md:text-sm ${
                isSelected 
                  ? 'gradient-bg hover:opacity-90 text-white' 
                  : 'hover:bg-gray-800 hover:border-brand-blue hover:text-brand'
              }`}
              size="sm"
            >
              {isSelected ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Selected
                </>
              ) : (
                <>
                  <Circle className="w-3 h-3 mr-1" />
                  Select
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
