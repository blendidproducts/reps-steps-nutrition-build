import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Apple, Droplets, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { getTodayDate } from '@/components/services/streakManager';

export default function ProgramReminderPopup() {
  const [reminders, setReminders] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkReminders();
    
    // Check reminders every 30 minutes
    const interval = setInterval(checkReminders, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const checkReminders = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      if (!userData.active_program) return;

      const today = getTodayDate();
      const lastActivity = userData.last_activity_date;
      
      // Check if user hasn't worked out today
      if (lastActivity !== today) {
        const currentHour = new Date().getHours();
        
        const newReminders = [];
        
        // Morning reminder (7-9 AM)
        if (currentHour >= 7 && currentHour < 9) {
          const morningShown = sessionStorage.getItem(`morning_reminder_${today}`);
          if (!morningShown) {
            newReminders.push({
              id: 'morning',
              icon: Flame,
              color: 'from-orange-500 to-red-500',
              title: 'Good Morning!',
              message: "Time to fuel up with breakfast and prepare for today's workout.",
              type: 'morning'
            });
            sessionStorage.setItem(`morning_reminder_${today}`, 'shown');
          }
        }
        
        // Pre-workout reminder (5-7 PM)
        if (currentHour >= 17 && currentHour < 19) {
          const workoutShown = sessionStorage.getItem(`workout_reminder_${today}`);
          if (!workoutShown) {
            newReminders.push({
              id: 'workout',
              icon: Dumbbell,
              color: 'from-blue-500 to-purple-500',
              title: 'Workout Time!',
              message: `Day ${userData.active_program.current_day} is waiting! Hydrate with 16oz water before starting.`,
              type: 'workout'
            });
            sessionStorage.setItem(`workout_reminder_${today}`, 'shown');
          }
        }
        
        // Hydration check (every 3 hours)
        const hydrationShown = sessionStorage.getItem(`hydration_${today}_${Math.floor(currentHour / 3)}`);
        if (!hydrationShown && currentHour >= 9 && currentHour <= 20) {
          newReminders.push({
            id: 'hydration',
            icon: Droplets,
            color: 'from-cyan-500 to-blue-500',
            title: 'Water Check!',
            message: 'Aim for 100oz throughout the day. Stay hydrated!',
            type: 'hydration'
          });
          sessionStorage.setItem(`hydration_${today}_${Math.floor(currentHour / 3)}`, 'shown');
        }
        
        // Nutrition reminder (meal times)
        if ((currentHour >= 12 && currentHour < 13) || (currentHour >= 18 && currentHour < 19)) {
          const mealTime = currentHour >= 12 ? 'lunch' : 'dinner';
          const nutritionShown = sessionStorage.getItem(`nutrition_${mealTime}_${today}`);
          if (!nutritionShown) {
            newReminders.push({
              id: `nutrition_${mealTime}`,
              icon: Apple,
              color: 'from-green-500 to-emerald-500',
              title: 'Nutrition Time!',
              message: `Don't skip ${mealTime}! Follow your meal plan for best results.`,
              type: 'nutrition'
            });
            sessionStorage.setItem(`nutrition_${mealTime}_${today}`, 'shown');
          }
        }
        
        // Evening reminder (9-10 PM)
        if (currentHour >= 21 && currentHour < 22) {
          const eveningShown = sessionStorage.getItem(`evening_reminder_${today}`);
          if (!eveningShown && lastActivity !== today) {
            newReminders.push({
              id: 'evening',
              icon: Flame,
              color: 'from-red-500 to-pink-500',
              title: '⚠️ Streak Alert!',
              message: `Complete a workout NOW to save your ${userData.current_streak || 0}-day streak!`,
              type: 'evening',
              urgent: true
            });
            sessionStorage.setItem(`evening_reminder_${today}`, 'shown');
          }
        }
        
        setReminders(newReminders);
      }
    } catch (error) {
      console.error('Failed to check reminders:', error);
    }
  };

  const dismissReminder = (reminderId) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId));
  };

  return (
    <AnimatePresence>
      {reminders.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-3 max-w-sm">
          {reminders.map(reminder => {
            const Icon = reminder.icon;
            return (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, x: 300, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 300, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`bg-gradient-to-r ${reminder.color} p-4 rounded-xl shadow-2xl border-2 ${reminder.urgent ? 'border-red-300 animate-pulse' : 'border-white/30'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-1">{reminder.title}</h3>
                    <p className="text-white/90 text-sm">{reminder.message}</p>
                  </div>
                  <button
                    onClick={() => dismissReminder(reminder.id)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}