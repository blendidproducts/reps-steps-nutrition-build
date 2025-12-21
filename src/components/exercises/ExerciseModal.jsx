import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Target, Lightbulb, Zap, Clock } from "lucide-react";

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

export default function ExerciseModal({ exercise, isOpen, onClose }) {
  if (!exercise) return null;

  const isTimeBased = exercise.metric === 'time';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {exercise.name}
          </DialogTitle>
          <div className="flex gap-2 pt-2 flex-wrap">
            <Badge variant="outline" className={`${categoryColors[exercise.category] || ""} capitalize`}>
              {exercise.category?.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className={`${difficultyColors[exercise.difficulty] || ""} capitalize`}>
              {exercise.difficulty}
            </Badge>
             {isTimeBased && (
              <Badge variant="outline" className="border-cyan-500/50 bg-cyan-900/50 text-cyan-300">
                <Clock className="w-3 h-3 mr-1" />
                Time-based
              </Badge>
            )}
          </div>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="w-full h-64 bg-background rounded-lg flex items-center justify-center overflow-hidden mb-4">
            {exercise.video_url ? (
              <div className="w-full h-full">
                {exercise.video_url.includes('youtube.com') || exercise.video_url.includes('youtu.be') ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={exercise.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    title={exercise.name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  />
                ) : (
                  <video
                    src={exercise.video_url}
                    controls
                    className="w-full h-full object-cover rounded-lg"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            ) : exercise.image_url ? (
              <img src={exercise.image_url} alt={exercise.name} className="w-full h-full object-contain" />
            ) : (
              <div className="text-center">
                <Target className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500">Exercise Demo</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-gray-300 leading-relaxed">{exercise.description}</p>
          </div>

          {exercise.instructions && exercise.instructions.length > 0 && (
            <Card className="bg-background border-border">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Instructions
                </h3>
                <ol className="space-y-2 text-gray-300">
                  {exercise.instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 bg-gray-700 text-brand-blue rounded-full flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {exercise.tips && exercise.tips.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-900/20">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-amber-300">
                  <Lightbulb className="w-5 h-5" />
                  Pro Tips
                </h3>
                <ul className="space-y-1 text-amber-300/90 list-disc list-inside">
                  {exercise.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
            <Card className="bg-background border-border">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-400" />
                  Primary Muscles
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {exercise.muscle_groups.map((muscle, index) => (
                    <Badge key={index} variant="secondary" className="bg-gray-700 text-gray-300">
                      {muscle}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={onClose} className="gradient-bg text-white hover:opacity-90">
              Got It
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}