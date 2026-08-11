import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Minus, Square, Footprints, Route, Zap, Target, Link as LinkIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { thumbImg } from "@/lib/imgOpt";

export default function RestScreen({
  isResting, activeCardio, workout, currentExerciseIndex, currentExercise,
  restTimer, restCardioTotal, extendedRestTime, cardioTimer, formatTime,
  addRestTime, startCardio, stopCardio, skipRest, openSupersetModal
}) {
  if (!isResting) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-3 overflow-hidden"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <Card className="bg-gray-900/80 border-brand-blue/30 text-white w-full max-w-sm flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
          <CardContent className="p-3 flex flex-col overflow-hidden h-full">
            {!activeCardio ? (
              <>
                <div className="flex-shrink-0">
                  <h2 className="text-xl font-bold mb-2 text-brand-blue text-center">ACTIVE RECOVERY</h2>
                  <div className="flex items-center justify-center gap-2 mb-3" role="group" aria-label="Rest timer controls">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { const dec = workout.exercises[currentExerciseIndex]?.category === 'warmup' ? -5 : -15; addRestTime(dec); }}
                        aria-label="Decrease rest time by 15 seconds"
                        className="w-9 h-9 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors touch-manipulation" disabled={restTimer <= 5}>
                        <Minus className="w-4 h-4" aria-hidden="true" />
                      </button>
                      {workout.exercises[currentExerciseIndex]?.category !== 'warmup' && (
                        <button onClick={() => addRestTime(-30)} aria-label="Decrease rest time by 30 seconds" className="w-9 h-9 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center text-[10px] font-bold touch-manipulation" disabled={restTimer <= 30}>-30</button>
                      )}
                    </div>
                    <div className="text-5xl font-bold" role="timer" aria-label={`${restTimer} seconds remaining`} aria-live="off">{restTimer}s</div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { const inc = workout.exercises[currentExerciseIndex]?.category === 'warmup' ? 5 : 15; addRestTime(inc); }}
                        aria-label="Increase rest time by 15 seconds"
                        className="w-9 h-9 bg-blue-600/50 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors touch-manipulation">
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                      {workout.exercises[currentExerciseIndex]?.category !== 'warmup' && (
                        <button onClick={() => addRestTime(30)} aria-label="Increase rest time by 30 seconds" className="w-9 h-9 bg-blue-600/50 hover:bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold touch-manipulation">+30</button>
                      )}
                    </div>
                  </div>
                  {extendedRestTime > 0 && <p className="text-xs text-blue-400 mb-2 text-center">+ {extendedRestTime}s added</p>}
                  <div className="mb-2">
                    <p className="text-xs text-gray-400 text-center">Cardio Time: {restCardioTotal}s / {workout.rest_time || 60}s</p>
                    <Progress value={(restCardioTotal / (workout.rest_time || 60)) * 100} className="h-2 mt-1" />
                    {restTimer <= 0 && restCardioTotal >= (workout.rest_time || 60) && <p className="text-[10px] text-green-400 mt-1 text-center">✓ Rest complete - tap SKIP</p>}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 mb-2" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {currentExerciseIndex > 0 && (
                      <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-2">
                        <p className="text-[9px] text-green-400 font-bold mb-1">✓ COMPLETED</p>
                        <div className="w-full h-14 bg-gray-800 rounded mb-1 flex items-center justify-center overflow-hidden">
                          {workout.exercises[currentExerciseIndex - 1]?.image_url ? <img src={thumbImg(workout.exercises[currentExerciseIndex - 1].image_url)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <Target className="w-5 h-5 text-gray-600" />}
                        </div>
                        <p className="text-[9px] font-semibold text-white line-clamp-2">{workout.exercises[currentExerciseIndex - 1]?.exercise_name}</p>
                      </div>
                    )}
                    <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-lg p-2">
                      <p className="text-[9px] text-brand-blue font-bold mb-1">▶ UP NEXT</p>
                      <div className="w-full h-14 bg-gray-800 rounded mb-1 flex items-center justify-center overflow-hidden">
                        {currentExercise?.image_url ? <img src={thumbImg(currentExercise.image_url)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <Target className="w-5 h-5 text-gray-600" />}
                      </div>
                      <p className="text-[9px] font-semibold text-white line-clamp-2">{currentExercise?.exercise_name}</p>
                      <p className="text-[9px] text-gray-400">{currentExercise?.metric === 'time' ? `${currentExercise?.target_time}s` : `${currentExercise?.target_reps} reps`}</p>
                    </div>
                  </div>
                  {currentExercise?.instructions && (
                    <div className="bg-gray-800/50 rounded-lg p-2 mb-2 max-h-20 overflow-y-auto">
                      <p className="text-[9px] text-brand-blue font-semibold mb-1">How to:</p>
                      <ul className="text-[9px] text-gray-300 space-y-0.5">{currentExercise.instructions.slice(0, 3).map((inst, i) => <li key={i} className="line-clamp-1">• {inst}</li>)}</ul>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mb-2 text-center">Choose cardio or skip</p>
                  <div className="grid grid-cols-3 gap-1.5 mb-2" role="group" aria-label="Cardio activity options">
                    <Button onClick={() => startCardio('walk')} aria-label="Start walking cardio" className="flex flex-col items-center gap-1 h-auto py-3 bg-green-600/20 border-2 border-green-500 text-green-300 hover:bg-green-600/40 touch-manipulation"><Footprints className="w-5 h-5" aria-hidden="true" /><span className="text-[10px] font-bold">WALK</span></Button>
                    <Button onClick={() => startCardio('jog')} aria-label="Start jogging cardio" className="flex flex-col items-center gap-1 h-auto py-3 bg-yellow-600/20 border-2 border-yellow-500 text-yellow-300 hover:bg-yellow-600/40 touch-manipulation"><Route className="w-5 h-5" aria-hidden="true" /><span className="text-[10px] font-bold">JOG</span></Button>
                    <Button onClick={() => startCardio('sprint')} aria-label="Start sprinting cardio" className="flex flex-col items-center gap-1 h-auto py-3 bg-red-600/20 border-2 border-red-500 text-red-300 hover:bg-red-600/40 touch-manipulation"><Zap className="w-5 h-5" aria-hidden="true" /><span className="text-[10px] font-bold">SPRINT</span></Button>
                  </div>
                </div>
                <div className="flex-shrink-0 grid grid-cols-2 gap-2 border-t border-brand-blue/20 pt-2">
                  <Button onClick={skipRest} aria-label="Skip rest and continue workout" variant="outline" className="border-gray-500 text-gray-300 hover:bg-gray-700 touch-manipulation min-h-[52px] text-xs font-bold">SKIP REST</Button>
                  <Button onClick={openSupersetModal} aria-label="Configure superset settings" className="bg-purple-600/20 border-2 border-purple-500 text-purple-300 hover:bg-purple-600/40 touch-manipulation min-h-[52px] text-xs font-bold"><LinkIcon className="w-3 h-3 mr-1" aria-hidden="true" />SUPERSET</Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-shrink-0">
                  <h2 className="text-2xl font-bold mb-2 text-brand-blue uppercase text-center">{activeCardio.type}ING</h2>
                  <div className="text-6xl font-bold mb-3 text-brand-blue animate-pulse text-center">{formatTime(cardioTimer)}</div>
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 text-center">Total Cardio: {restCardioTotal}s / {workout.rest_time || 60}s</p>
                    <Progress value={(restCardioTotal / (workout.rest_time || 60)) * 100} className="h-2 mt-1" />
                    {restTimer <= 0 && restCardioTotal >= (workout.rest_time || 60) && <p className="text-[10px] text-green-400 mt-1 text-center">✓ Rest complete!</p>}
                  </div>
                </div>
                <div className="flex-shrink-0 grid grid-cols-2 gap-2 border-t border-brand-blue/20 pt-2">
                  <Button onClick={stopCardio} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold touch-manipulation min-h-[52px] text-xs"><Square className="w-4 h-4 mr-1" />STOP & SWITCH</Button>
                  <Button onClick={() => { stopCardio(); if (restCardioTotal >= (workout.rest_time || 60)) setTimeout(() => skipRest(), 100); }}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold touch-manipulation min-h-[52px] text-xs">DONE</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}