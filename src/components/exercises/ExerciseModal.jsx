import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Target, Lightbulb, Zap, Clock, Play, Box, Activity } from "lucide-react";
import Exercise3DViewer from "@/components/Exercise3DViewer";
const RepTracker = React.lazy(() => import("@/components/workout/RepTracker"));

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
  const [show3D, setShow3D] = useState(false);
  const [showRepTracker, setShowRepTracker] = useState(false);
  
  if (!exercise) return null;

  const isTimeBased = exercise.metric === 'time';
  
  const getYouTubeVideoId = (exerciseName) => {
    const videoMap = {
      'push': 'IODxDxX7oi4',
      'squat': '9cYEuFbBLSY',
      'plank': 'pSHjTRCQxIw',
      'lunge': 'QOVaHwm-Q6U',
      'burpee': 'dZgVxmf6jkA',
      'pull': 'eGo4IYlbE5g',
      'dip': 'yN6Q1UI_xkE',
      'mountain climber': 'nmwgirgXLYM',
      'jumping jack': 'c4DAnQ6DtF8',
      'crunch': '5ER5Of4EISE',
      'arm circles': 'IODxDxX7oi4',
      'quad stretch': 'QOVaHwm-Q6U',
      'calf raises': '9cYEuFbBLSY',
      'hip circles': 'nmwgirgXLYM',
      'cat-cow': 'pSHjTRCQxIw',
      'toe touches': 'g_tea8ZNk5A',
      'tricep': 'yN6Q1UI_xkE',
      'chest': 'IODxDxX7oi4',
    };

    const name = (exerciseName || '').toLowerCase();
    for (const [key, videoId] of Object.entries(videoMap)) {
      if (name.includes(key)) {
        return videoId;
      }
    }
    return 'g_tea8ZNk5A';
  };

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
          {/* View Options */}
          {/* AI Body Tracking — primary full-width CTA */}
          <button
            onClick={() => setShowRepTracker(true)}
            className="w-full mb-3 py-3 rounded-xl bg-gradient-to-r from-green-600 to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-green-500/30"
          >
            <Activity className="w-4 h-4" />
            AI BODY TRACKING — Count My Reps
            <span className="bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">LIVE</span>
          </button>
          <div className="flex justify-center gap-3 mb-4">
            <Button
              onClick={() => setShow3D(false)}
              size="sm"
              className={`flex-1 ${!show3D ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'} hover:opacity-90`}
            >
              <Play className="w-4 h-4 mr-2" />
              VIDEO
            </Button>
            {exercise.model_url && (
              <Button
                onClick={() => setShow3D(true)}
                size="sm"
                className={`flex-1 ${show3D ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'} hover:opacity-90`}
              >
                <Box className="w-4 h-4 mr-2" />
                3D
              </Button>
            )}
          </div>
          {showRepTracker && (
            <React.Suspense fallback={null}>
              <RepTracker
                exerciseName={exercise.name}
                onComplete={() => setShowRepTracker(false)}
                onClose={() => setShowRepTracker(false)}
              />
            </React.Suspense>
          )}

          <div className="w-full h-64 bg-background rounded-lg flex items-center justify-center overflow-hidden mb-4">
            {show3D && exercise.model_url ? (
              <Exercise3DViewer modelUrl={exercise.model_url} exerciseName={exercise.name} />
            ) : (
              <>
                {(exercise.youtube_url || exercise.video_url) ? (
                  <div className="w-full h-full">
                    {exercise.youtube_url ? (
                      <iframe
                        width="100%"
                        height="100%"
                        src={exercise.youtube_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        title={exercise.name}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded-lg"
                      />
                    ) : exercise.video_url.includes('youtube.com') || exercise.video_url.includes('youtu.be') ? (
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
                ) : (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(exercise.name)}?rel=0`}
                    title={exercise.name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  />
                )}
              </>
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