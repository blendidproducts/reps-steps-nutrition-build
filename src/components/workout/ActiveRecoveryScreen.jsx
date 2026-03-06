import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, Square, Footprints, Route, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ActiveRecoveryScreen({
  show, activeCardio, restTimer, cardioTimer, formatTime,
  addRestTime, startCardio, stopCardio, onClose
}) {
  if (!show) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-3 overflow-hidden"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <Card className="bg-gray-900/80 border-cyan-500/30 text-white w-full max-w-sm flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
          <CardContent className="p-3 flex flex-col overflow-hidden h-full">
            {!activeCardio ? (
              <>
                <div className="flex-shrink-0">
                  <h2 className="text-xl font-bold mb-2 text-cyan-400 text-center">ACTIVE RECOVERY</h2>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => addRestTime(-15)} className="w-9 h-9 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center touch-manipulation" disabled={restTimer <= 5}><Minus className="w-4 h-4" /></button>
                      <button onClick={() => addRestTime(-30)} className="w-9 h-9 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center text-[10px] font-bold touch-manipulation" disabled={restTimer <= 30}>-30</button>
                    </div>
                    <div className="text-5xl font-bold">{restTimer}s</div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => addRestTime(15)} className="w-9 h-9 bg-cyan-600/50 hover:bg-cyan-600 rounded-full flex items-center justify-center touch-manipulation"><Plus className="w-4 h-4" /></button>
                      <button onClick={() => addRestTime(30)} className="w-9 h-9 bg-cyan-600/50 hover:bg-cyan-600 rounded-full flex items-center justify-center text-[10px] font-bold touch-manipulation">+30</button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 mb-3">
                  <p className="text-xs text-gray-400 mb-2 text-center">Choose cardio activity</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={() => startCardio('walk')} className="flex flex-col items-center gap-1 h-auto py-3 bg-green-600/20 border-2 border-green-500 text-green-300 hover:bg-green-600/40 touch-manipulation"><Footprints className="w-5 h-5" /><span className="text-[10px] font-bold">WALK</span></Button>
                    <Button onClick={() => startCardio('jog')} className="flex flex-col items-center gap-1 h-auto py-3 bg-yellow-600/20 border-2 border-yellow-500 text-yellow-300 hover:bg-yellow-600/40 touch-manipulation"><Route className="w-5 h-5" /><span className="text-[10px] font-bold">JOG</span></Button>
                    <Button onClick={() => startCardio('sprint')} className="flex flex-col items-center gap-1 h-auto py-3 bg-red-600/20 border-2 border-red-500 text-red-300 hover:bg-red-600/40 touch-manipulation"><Zap className="w-5 h-5" /><span className="text-[10px] font-bold">SPRINT</span></Button>
                  </div>
                </div>
                <div className="flex-shrink-0 border-t border-cyan-500/20 pt-2">
                  <Button onClick={onClose} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold touch-manipulation min-h-[52px]">DONE - Continue Workout</Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-2 text-brand-blue uppercase text-center flex-shrink-0">{activeCardio.type}ING</h2>
                <div className="text-6xl font-bold mb-3 text-brand-blue animate-pulse text-center flex-shrink-0">{formatTime(cardioTimer)}</div>
                <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                  <Button onClick={stopCardio} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold touch-manipulation min-h-[52px] text-xs"><Square className="w-4 h-4 mr-1" />STOP & SWITCH</Button>
                  <Button onClick={() => { stopCardio(); onClose(); }} className="bg-green-500 hover:bg-green-600 text-white font-bold touch-manipulation min-h-[52px] text-xs">DONE</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}