import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, FolderPlus, Check, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

export default function AddToProgramSection() {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState(null); // 'new' | 'existing'
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [newProgramName, setNewProgramName] = useState("");
  const [newProgramDay, setNewProgramDay] = useState(null);
  const [saving, setSaving] = useState(false);
  const [workoutData, setWorkoutData] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadLatestWorkout();
  }, []);

  const loadLatestWorkout = async () => {
    const sessions = await base44.entities.WorkoutSession.list('-created_date', 1);
    if (sessions.length > 0) {
      const session = sessions[0];
      const workouts = await base44.entities.Workout.filter({ id: session.workout_id });
      if (workouts.length > 0) setWorkoutData(workouts[0]);
    }
  };

  const loadPrograms = async () => {
    const progs = await base44.entities.WeeklyProgram.list();
    setPrograms(progs);
  };

  const handleExpand = () => {
    if (!expanded) loadPrograms();
    setExpanded(!expanded);
    setMode(null);
    setDone(false);
  };

  const saveWorkoutToProgram = async (programId, day) => {
    if (!workoutData) { toast.error("No workout data found"); return; }
    setSaving(true);
    try {
      // First save as a SavedWorkout
      const saved = await base44.entities.SavedWorkout.create({
        name: workoutData.name || "Completed Workout",
        exercises: workoutData.exercises?.map(ex => ({
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          target_reps: ex.target_reps || ex.completed_reps || 0,
          target_time: ex.target_time || 0,
          sets: ex.sets || 1,
          superset_with_next: ex.superset_with_next || false
        })) || [],
        workout_type: workoutData.workout_type || "rep_based",
        difficulty: workoutData.difficulty || "intermediate"
      });

      // Update the program's schedule for the chosen day
      const program = programs.find(p => p.id === programId);
      const updatedSchedule = { ...(program?.schedule || {}) };
      updatedSchedule[day] = saved.id;
      await base44.entities.WeeklyProgram.update(programId, { schedule: updatedSchedule });

      toast.success(`Added to ${DAY_LABELS[day]} in "${program.name}"`);
      setDone(true);
    } catch (e) {
      console.error(e);
      toast.error("Failed to add to program");
    }
    setSaving(false);
  };

  const createNewProgram = async () => {
    if (!newProgramName.trim()) { toast.error("Enter a program name"); return; }
    if (!newProgramDay) { toast.error("Pick a day"); return; }
    if (!workoutData) { toast.error("No workout data found"); return; }
    setSaving(true);
    try {
      const saved = await base44.entities.SavedWorkout.create({
        name: workoutData.name || "Completed Workout",
        exercises: workoutData.exercises?.map(ex => ({
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          target_reps: ex.target_reps || ex.completed_reps || 0,
          target_time: ex.target_time || 0,
          sets: ex.sets || 1,
          superset_with_next: ex.superset_with_next || false
        })) || [],
        workout_type: workoutData.workout_type || "rep_based",
        difficulty: workoutData.difficulty || "intermediate"
      });

      const schedule = {};
      schedule[newProgramDay] = saved.id;
      await base44.entities.WeeklyProgram.create({
        name: newProgramName.trim(),
        schedule,
        is_active: false
      });

      toast.success(`Created "${newProgramName}" with workout on ${DAY_LABELS[newProgramDay]}`);
      setDone(true);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create program");
    }
    setSaving(false);
  };

  if (done) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
        <Check className="w-6 h-6 text-green-400 mx-auto mb-2" />
        <p className="text-green-400 font-semibold text-sm">Added to program!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Button
        variant="outline"
        onClick={handleExpand}
        className="w-full border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500"
      >
        <Calendar className="w-4 h-4 mr-2" />
        Add to Program
        {expanded ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
      </Button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              {/* Mode selection */}
              {!mode && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setMode("existing")}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1 border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                  >
                    <FolderPlus className="w-5 h-5" />
                    <span className="text-xs font-bold">Current Program</span>
                    <span className="text-[10px] text-gray-500">{programs.length} program{programs.length !== 1 ? 's' : ''}</span>
                  </Button>
                  <Button
                    onClick={() => setMode("new")}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1 border-green-500/40 text-green-400 hover:bg-green-500/10"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-bold">New Program</span>
                    <span className="text-[10px] text-gray-500">Create fresh</span>
                  </Button>
                </div>
              )}

              {/* Existing program mode */}
              {mode === "existing" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-semibold">Select a program:</p>
                    <button onClick={() => { setMode(null); setSelectedProgram(null); setSelectedDay(null); }} className="text-xs text-gray-500 hover:text-gray-300">← Back</button>
                  </div>
                  {programs.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-500 mb-2">No programs yet</p>
                      <Button onClick={() => setMode("new")} size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Create One
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {programs.map(prog => (
                        <button
                          key={prog.id}
                          onClick={() => { setSelectedProgram(prog); setSelectedDay(null); }}
                          className={`w-full text-left p-2 rounded-lg border transition-colors ${
                            selectedProgram?.id === prog.id
                              ? 'bg-blue-500/20 border-blue-500/50'
                              : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'
                          }`}
                        >
                          <div className="font-semibold text-white text-sm">{prog.name}</div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {DAYS.map(d => (
                              <span key={d} className={`text-[9px] px-1.5 py-0.5 rounded ${prog.schedule?.[d] ? 'bg-blue-500/30 text-blue-300' : 'bg-gray-700/50 text-gray-500'}`}>
                                {DAY_LABELS[d]}
                              </span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Day picker for existing program */}
                  {selectedProgram && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 font-semibold">Pick a day:</p>
                      <div className="grid grid-cols-7 gap-1">
                        {DAYS.map(d => {
                          const hasWorkout = selectedProgram.schedule?.[d];
                          return (
                            <button
                              key={d}
                              onClick={() => setSelectedDay(d)}
                              className={`py-2 rounded text-[10px] font-bold transition-colors ${
                                selectedDay === d
                                  ? 'bg-blue-600 text-white'
                                  : hasWorkout
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                            >
                              {DAY_LABELS[d]}
                              {hasWorkout && <div className="text-[7px]">⚠️</div>}
                            </button>
                          );
                        })}
                      </div>
                      {selectedDay && selectedProgram.schedule?.[selectedDay] && (
                        <p className="text-[10px] text-yellow-400">⚠️ This will replace the existing workout for {DAY_LABELS[selectedDay]}</p>
                      )}
                      <Button
                        onClick={() => saveWorkoutToProgram(selectedProgram.id, selectedDay)}
                        disabled={!selectedDay || saving}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
                      >
                        {saving ? "Saving..." : `Add to ${selectedDay ? DAY_LABELS[selectedDay] : '...'}`}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* New program mode */}
              {mode === "new" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-semibold">Create new program:</p>
                    <button onClick={() => { setMode(null); setNewProgramName(""); setNewProgramDay(null); }} className="text-xs text-gray-500 hover:text-gray-300">← Back</button>
                  </div>
                  <Input
                    placeholder="Program name (e.g. My Upper Body Week)"
                    value={newProgramName}
                    onChange={e => setNewProgramName(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                  <p className="text-xs text-gray-400">Assign this workout to a day:</p>
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS.map(d => (
                      <button
                        key={d}
                        onClick={() => setNewProgramDay(d)}
                        className={`py-2 rounded text-[10px] font-bold transition-colors ${
                          newProgramDay === d ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {DAY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={createNewProgram}
                    disabled={!newProgramName.trim() || !newProgramDay || saving}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm"
                  >
                    {saving ? "Creating..." : "Create Program"}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}