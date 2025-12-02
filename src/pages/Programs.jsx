
import React, { useState, useEffect } from "react";
import { WeeklyProgram } from "@/entities/WeeklyProgram";
import { SavedWorkout } from "@/entities/SavedWorkout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Play, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [savedWorkouts, setSavedWorkouts] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProgram, setNewProgram] = useState({
    name: '',
    description: '',
    goal: '',
    schedule: {}
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [programsData, workoutsData] = await Promise.all([
      WeeklyProgram.list('-created_date'),
      SavedWorkout.list()
    ]);
    setPrograms(programsData);
    setSavedWorkouts(workoutsData);
  };

  const createProgram = async () => {
    if (!newProgram.name) {
      toast.error('Please enter a program name');
      return;
    }

    await WeeklyProgram.create({
      ...newProgram,
      start_date: new Date().toISOString().split('T')[0],
      is_active: false
    });

    toast.success('Program created!');
    setIsCreating(false);
    setNewProgram({ name: '', description: '', goal: '', schedule: {} });
    loadData();
  };

  const deleteProgram = async (id) => {
    if (confirm('Delete this program?')) {
      await WeeklyProgram.delete(id);
      toast.success('Program deleted!');
      loadData();
    }
  };

  const activateProgram = async (id) => {
    // Deactivate all programs first
    const updates = programs.map(p => 
      WeeklyProgram.update(p.id, { is_active: p.id === id })
    );
    await Promise.all(updates);
    toast.success('Program activated!');
    loadData();
  };

  const getWorkoutName = (workoutId) => {
    const workout = savedWorkouts.find(w => w.id === workoutId);
    return workout ? workout.name : 'Rest Day';
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Weekly Programs</h1>
              <p className="text-lg text-white/90">
                Plan your week and stay consistent with structured programs
              </p>
            </div>
            <Button
              onClick={() => setIsCreating(!isCreating)}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              <Plus className="w-5 h-5 mr-2" />
              {isCreating ? 'Cancel' : 'New Program'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Create Program Form */}
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-card border-border mb-6">
              <CardHeader>
                <CardTitle>Create New Program</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Program Name</Label>
                    <Input
                      value={newProgram.name}
                      onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
                      placeholder="e.g., 4-Week Strength Builder"
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label>Goal</Label>
                    <Input
                      value={newProgram.goal}
                      onChange={(e) => setNewProgram({...newProgram, goal: e.target.value})}
                      placeholder="e.g., Build muscle, Lose weight"
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newProgram.description}
                    onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
                    placeholder="Describe your program..."
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Weekly Schedule</Label>
                  <div className="grid gap-3">
                    {days.map(day => (
                      <div key={day} className="flex items-center gap-3">
                        <span className="w-28 capitalize font-medium">{day}</span>
                        <Select
                          value={newProgram.schedule[day] || ''}
                          onValueChange={(value) => setNewProgram({
                            ...newProgram,
                            schedule: {...newProgram.schedule, [day]: value}
                          })}
                        >
                          <SelectTrigger className="flex-1 bg-background border-border">
                            <SelectValue placeholder="Select workout or rest" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rest">Rest Day</SelectItem>
                            {savedWorkouts.map(workout => (
                              <SelectItem key={workout.id} value={workout.id}>
                                {workout.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreating(false)}
                    className="bg-background border-border"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createProgram}
                    className="gradient-bg text-white hover:opacity-90"
                  >
                    Create Program
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Programs List */}
        {programs.length > 0 ? (
          <div className="space-y-6">
            {programs.map(program => (
              <Card key={program.id} className={`bg-card border-2 ${program.is_active ? 'border-brand-blue' : 'border-border'}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle>{program.name}</CardTitle>
                        {program.is_active && (
                          <Badge className="bg-brand-blue text-white">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      {program.description && (
                        <p className="text-gray-400">{program.description}</p>
                      )}
                      {program.goal && (
                        <p className="text-sm text-brand-blue mt-1">Goal: {program.goal}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!program.is_active && (
                        <Button
                          size="sm"
                          onClick={() => activateProgram(program.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Activate
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteProgram(program.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                    {days.map(day => {
                      const workoutId = program.schedule[day];
                      const isRest = !workoutId || workoutId === 'rest';
                      return (
                        <div key={day} className={`p-3 rounded-lg border ${isRest ? 'bg-gray-800/50 border-gray-700' : 'bg-brand-blue/10 border-brand-blue/30'}`}>
                          <div className="text-xs font-semibold mb-1 capitalize text-gray-400">{day.slice(0,3)}</div>
                          <div className="text-sm font-medium">
                            {isRest ? '😴 Rest' : getWorkoutName(workoutId)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold mb-2">No Programs Yet</h3>
              <p className="text-gray-400 mb-6">
                Create your first weekly program to stay organized and consistent
              </p>
              <Button
                onClick={() => setIsCreating(true)}
                className="gradient-bg text-white hover:opacity-90"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Program
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
