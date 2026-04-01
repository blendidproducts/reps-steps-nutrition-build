import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Play, Square, Plus, Minus, Timer, Target, Footprints, Route, Zap,
  RefreshCw, Link as LinkIcon, Check, Search, Trophy, Box
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Exercise3DViewer from "@/components/Exercise3DViewer";

export function SupersetTransitionModal({ show, activeCardio, workout, currentExerciseIndex, cardioTimer, formatTime, startCardio, stopCardio, skipSupersetTransition, stopCardioAndContinueSuperset }) {
  if (!show) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
        <Card className="bg-gray-900/80 border-purple-500/30 text-white w-full max-w-sm my-auto" style={{ maxHeight: '95vh' }}>
          <CardContent className="p-3 sm:p-6 text-center overflow-y-auto" style={{ maxHeight: 'calc(95vh - 2rem)' }}>
            {!activeCardio ? (
              <>
                <h2 className="text-2xl font-bold mb-2 text-purple-400">SUPERSET TRANSITION</h2>
                <p className="text-sm text-gray-400 mb-4">Optional cardio before next exercise</p>
                {workout.exercises[currentExerciseIndex + 1] && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-4">
                    <p className="text-xs text-purple-400 font-bold mb-2">▶ UP NEXT</p>
                    <div className="w-full h-20 bg-gray-800 rounded mb-2 flex items-center justify-center overflow-hidden">
                      {workout.exercises[currentExerciseIndex + 1].image_url ? (
                        <img src={workout.exercises[currentExerciseIndex + 1].image_url} alt={workout.exercises[currentExerciseIndex + 1].exercise_name} className="w-full h-full object-cover" />
                      ) : (<Target className="w-8 h-8 text-gray-600" />)}
                    </div>
                    <p className="text-sm font-semibold text-white">{workout.exercises[currentExerciseIndex + 1].exercise_name}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 mb-4" role="group" aria-label="Cardio activity options">
                  <Button onClick={() => startCardio('walk')} aria-label="Start walking" className="flex flex-col items-center gap-2 h-auto py-4 bg-green-600/20 border-2 border-green-500 text-green-300 hover:bg-green-600/40"><Footprints className="w-6 h-6" aria-hidden="true" /><span className="text-xs font-bold">WALK</span></Button>
                  <Button onClick={() => startCardio('jog')} aria-label="Start jogging" className="flex flex-col items-center gap-2 h-auto py-4 bg-yellow-600/20 border-2 border-yellow-500 text-yellow-300 hover:bg-yellow-600/40"><Route className="w-6 h-6" aria-hidden="true" /><span className="text-xs font-bold">JOG</span></Button>
                  <Button onClick={() => startCardio('sprint')} aria-label="Start sprinting" className="flex flex-col items-center gap-2 h-auto py-4 bg-red-600/20 border-2 border-red-500 text-red-300 hover:bg-red-600/40"><Zap className="w-6 h-6" aria-hidden="true" /><span className="text-xs font-bold">SPRINT</span></Button>
                </div>
                <Button onClick={skipSupersetTransition} aria-label="Skip cardio and continue superset" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold touch-manipulation min-h-[48px] mb-2">SKIP - Continue Superset</Button>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-2 text-brand-blue uppercase">{activeCardio.type}ING</h2>
                <div className="text-7xl font-bold mb-4 text-brand-blue animate-pulse">{formatTime(cardioTimer)}</div>
                <div className="grid grid-cols-2 gap-2 pb-2">
                  <Button onClick={stopCardio} aria-label="Stop cardio and switch activity" className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold touch-manipulation min-h-[56px] text-sm"><Square className="w-4 h-4 mr-1" aria-hidden="true" />STOP & SWITCH</Button>
                  <Button onClick={stopCardioAndContinueSuperset} aria-label="Finish cardio and continue superset" className="bg-purple-500 hover:bg-purple-600 text-white font-bold touch-manipulation min-h-[56px] text-sm">DONE - Continue</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export function AchievementPopup({ popup }) {
  if (!popup) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, scale: 0.5, y: -100 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5, y: -100 }}
        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[10000] px-4">
        <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-yellow-300 shadow-2xl">
          <CardContent className="p-6 text-center min-w-[280px]">
            <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: 2 }}>
              <Trophy className="w-16 h-16 text-white mx-auto mb-3" />
            </motion.div>
            <h3 className="text-2xl font-black text-white mb-2">{popup.title}</h3>
            <p className="text-lg font-bold text-black mb-1">{popup.message}</p>
            {popup.prevRecord > 0 && <p className="text-sm text-white/80">Previous: {popup.prevRecord}</p>}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export function VideoModal({ show, exerciseName, videoId, videoUrl, youtubeUrl, instructions, onClose }) {
  if (!show) return null;
  let src = `https://www.youtube.com/embed/${videoId}?rel=0`;
  if (youtubeUrl) {
    src = youtubeUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
  } else if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
    src = videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
  }
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-2" onClick={onClose}>
        <Card className="bg-gray-900 w-full max-w-2xl border-gray-800 max-h-[95vh] overflow-auto" onClick={e => e.stopPropagation()}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">{exerciseName}</h3>
              <button onClick={onClose} aria-label="Close video modal" className="no-min-height w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">✕</button>
            </div>
            <div className="w-full aspect-video bg-black rounded-lg mb-3 overflow-hidden">
              {(!youtubeUrl && videoUrl && !videoUrl.includes('youtube') && !videoUrl.includes('youtu.be')) ? (
                <video src={videoUrl} controls className="w-full h-full object-cover" />
              ) : (
                <iframe width="100%" height="100%" src={src} title={exerciseName}
                  frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
              )}
            </div>
            {instructions?.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                <h4 className="font-semibold mb-2 text-white text-sm">Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-gray-300">
                  {instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                </ol>
              </div>
            )}
            <Button onClick={onClose} aria-label="Close video guide" className="w-full gradient-bg text-white">Got It!</Button>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export function ThreeDViewModal({ show, exerciseName, modelUrl, instructions, onClose }) {
  if (!show) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-2" onClick={onClose}>
        <Card className="bg-gray-900 w-full max-w-2xl border-gray-800 max-h-[95vh] overflow-auto" onClick={e => e.stopPropagation()}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">{exerciseName} — 3D View</h3>
              <button onClick={onClose} aria-label="Close 3D view" className="no-min-height w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">✕</button>
            </div>
            <div className="w-full aspect-square bg-black rounded-lg mb-3 overflow-hidden" style={{marginTop: 0}}>
              {modelUrl ? (
                <Exercise3DViewer modelUrl={modelUrl} exerciseName={exerciseName} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center"><div className="text-6xl mb-2">🏋️</div><p className="text-gray-400 text-sm">No 3D model available</p></div>
                </div>
              )}
            </div>
            {instructions?.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                <h4 className="font-semibold mb-2 text-white text-sm">Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-gray-300">
                  {instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                </ol>
              </div>
            )}
            <Button onClick={onClose} aria-label="Close 3D model view" className="w-full gradient-bg text-white">Close</Button>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export function SupersetConfigModal({ show, selections, onToggle, onApply, onClose }) {
  if (!show) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={onClose} style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}>
        <Card className="bg-gray-900 w-full max-w-lg border-gray-800 my-auto flex flex-col" style={{ maxHeight: 'calc(100vh - 4rem)' }} onClick={e => e.stopPropagation()}>
          <CardContent className="p-4 sm:p-6 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
            <div className="flex-shrink-0 pb-3">
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-white flex items-center gap-2"><LinkIcon className="w-5 h-5 text-purple-400" />Configure Supersets</h3>
              <p className="text-xs sm:text-sm text-gray-400 mb-3">Select exercises to link together (no rest between them)</p>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 sm:p-3">
                <p className="text-xs text-purple-400 mb-1">💡 <strong>How Supersets Work:</strong></p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Check exercises to link them together</li>
                  <li>• Checked exercises = superset with the NEXT exercise</li>
                </ul>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 mb-3" style={{ minHeight: '200px' }}>
              {selections.map((selection, idx) => (
                <div key={selection.index} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <input type="checkbox" checked={selection.selected} onChange={() => onToggle(selection.index)} disabled={idx === selections.length - 1}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-600 text-purple-500 focus:ring-purple-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm sm:text-base truncate">{selection.name}</div>
                    {selection.selected && idx < selections.length - 1 && <div className="text-xs text-purple-400 mt-1">→ Superset with next</div>}
                    {idx === selections.length - 1 && <div className="text-xs text-gray-500 mt-1">Last exercise (can't superset)</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 sm:gap-3 flex-shrink-0 pt-3 border-t border-gray-700">
              <Button onClick={onApply} aria-label="Confirm superset configuration" className="flex-1 bg-purple-600 hover:bg-purple-700 min-h-[48px]"><Check className="w-4 h-4 mr-2" />Confirm</Button>
              <Button onClick={onClose} aria-label="Cancel superset configuration" variant="outline" className="flex-1 min-h-[48px] border-gray-600 hover:bg-gray-800">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export function SwapExerciseModal({ show, exercises, currentCategory, searchQuery, onSearch, onSwap, onClose }) {
  if (!show) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={onClose} style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}>
        <Card className="bg-gray-900 w-full max-w-lg border-gray-800 my-auto flex flex-col" style={{ maxHeight: 'calc(100vh - 4rem)' }} onClick={e => e.stopPropagation()}>
          <CardContent className="p-4 sm:p-6 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
            <h3 className="text-lg sm:text-xl font-bold mb-3 text-white flex-shrink-0">Swap Exercise</h3>
            <div className="relative mb-3 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search exercises..." value={searchQuery} onChange={(e) => onSearch(e.target.value)} className="pl-10 bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="overflow-y-auto flex-1 space-y-2" style={{ minHeight: '200px' }}>
              {exercises.filter(ex => ex.category === currentCategory || ex.category === 'full_body')
                .filter(ex => !searchQuery || ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || (ex.description && ex.description.toLowerCase().includes(searchQuery.toLowerCase())))
                .map(exercise => (
                  <button key={exercise.id} onClick={() => onSwap(exercise)} className="w-full text-left p-2 sm:p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors border border-gray-700 hover:border-brand-blue">
                    <div className="font-semibold text-white text-sm sm:text-base">{exercise.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{exercise.description}</div>
                  </button>
                ))}
            </div>
            <div className="flex-shrink-0 pt-3 border-t border-gray-700">
              <Button onClick={onClose} aria-label="Cancel exercise swap" variant="outline" className="w-full min-h-[48px] border-gray-600 hover:bg-gray-800">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export function VoiceCoachModal({ show, isVoiceActive, onActivate, onClose }) {
  if (!show) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={onClose}>
        <Card className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 w-full max-w-md border-purple-500/50 shadow-2xl" onClick={e => e.stopPropagation()}>
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <div className="inline-block p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-3">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">AI Voice Coach™</h2>
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white mb-3">🚀 NEW</Badge>
            </div>
            <div className="space-y-3 mb-4">
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <p className="text-xs text-purple-400 mb-1"><strong>Voice Commands:</strong></p>
                <p className="text-xs text-gray-300">Say "Reps and steps" + begin, [number] reps completed, walk, jog, sprint, skip, next, stop</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={onActivate} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold">🎤 {isVoiceActive ? 'Active!' : 'Activate'}</Button>
              <Button onClick={onClose} variant="outline" className="flex-1 border-gray-600 hover:bg-gray-800">Close</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}