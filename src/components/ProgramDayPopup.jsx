import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, Calendar } from "lucide-react";

export default function ProgramDayPopup({ program, onStart, onIgnore }) {
  if (!program) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto"
        onClick={onIgnore}
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ type: "spring", damping: 20 }}
          onClick={e => e.stopPropagation()}
          className="my-auto"
        >
          <Card className="bg-gradient-to-br from-brand-blue to-purple-600 border-none shadow-2xl max-w-md w-full relative max-h-[90vh] flex flex-col">
            <div className="absolute inset-0 bg-black/20"></div>
            
            <CardContent className="p-4 sm:p-6 text-center relative z-10 overflow-y-auto">::
              {/* Close Button */}
              <button
                onClick={onIgnore}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Trophy Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
                className="mb-4"
              >
                <div className="w-16 h-16 mx-auto bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-yellow-300" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  DAY {program.current_day}
                </h2>
                <p className="text-lg text-white/90 mb-1">{program.program_name}</p>
                <div className="flex items-center justify-center gap-2 text-white/80 text-sm mb-4">
                  <Calendar className="w-4 h-4" />
                  <span>Day {program.current_day} of {program.total_days}</span>
                </div>
              </motion.div>

              {/* Progress Bar */}
              <div className="bg-white/20 rounded-full h-2 mb-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(program.current_day / program.total_days) * 100}%` }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="bg-white h-full rounded-full"
                />
              </div>

              {/* Status Summary */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4 max-h-[40vh] overflow-y-auto"
              >
                <h3 className="text-white font-semibold mb-2 text-sm">Program Status</h3>
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: program.total_days }, (_, i) => i + 1).map(day => {
                    const isCompleted = program.completed_days?.includes(day);
                    const isCurrent = day === program.current_day;
                    return (
                      <div
                        key={day}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                            ? 'bg-yellow-400 text-black animate-pulse'
                            : 'bg-white/20 text-white/60'
                        }`}
                      >
                        <div>{day}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-white/80 mt-2">
                  <span>✓ Completed: {program.completed_days?.length || 0}</span>
                  <span>⚡ Current: Day {program.current_day}</span>
                  <span>📋 Remaining: {program.total_days - (program.completed_days?.length || 0)}</span>
                </div>
              </motion.div>

              {/* Message */}
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-white/90 mb-4 text-sm"
              >
                Ready to continue your journey? Let's crush Day {program.current_day}! 💪
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
              >
                <Button
                  onClick={onStart}
                  className="w-full bg-white text-brand-blue hover:bg-gray-100 font-bold text-base py-4 rounded-full shadow-lg"
                >
                  START DAY {program.current_day}
                </Button>
                <Button
                  onClick={onIgnore}
                  variant="outline"
                  className="w-full border-white/50 text-white hover:bg-white/10 font-semibold py-3"
                >
                  Maybe Later
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}