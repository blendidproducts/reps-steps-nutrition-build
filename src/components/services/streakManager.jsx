/**
 * Streak Manager - Single Source of Truth for Streak Logic
 * 
 * Core Rules:
 * 1. Streaks are based on calendar days in user's timezone, NOT 24-hour periods
 * 2. Same day activity = no change to streak
 * 3. Next consecutive day = streak + 1
 * 4. Missed day(s) = reset to 1
 * 5. All updates are atomic and centralized here
 */

import { base44 } from '@/api/base44Client';

/**
 * Get today's date in YYYY-MM-DD format (user's timezone)
 */
export function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date object at midnight local time
 */
export function parseCalendarDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Calculate difference in calendar days between two YYYY-MM-DD strings
 */
export function getCalendarDayDifference(date1String, date2String) {
  const date1 = parseCalendarDate(date1String);
  const date2 = parseCalendarDate(date2String);
  
  if (!date1 || !date2) return null;
  
  const diffMs = date2 - date1;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Update user streak based on activity completion
 * This is the ONLY function that should modify streak data
 * 
 * @param {Object} user - Current user object
 * @returns {Object} Updated streak data
 */
export async function updateStreak(user) {
  console.log('[STREAK] ========== STREAK UPDATE STARTED ==========');
  console.log('[STREAK] User ID:', user.id);
  console.log('[STREAK] Current streak:', user.current_streak || 0);
  console.log('[STREAK] Last activity date:', user.last_activity_date || 'never');
  
  const today = getTodayDate();
  console.log('[STREAK] Today:', today);
  
  const lastActivityDate = user.last_activity_date;
  
  // Case 1: No previous activity - start new streak
  if (!lastActivityDate) {
    console.log('[STREAK] First activity ever - starting streak at 1');
    const updates = {
      current_streak: 1,
      longest_streak: Math.max(1, user.longest_streak || 0),
      last_activity_date: today,
      total_workouts_completed: (user.total_workouts_completed || 0) + 1
    };
    
    await base44.auth.updateMe(updates);
    console.log('[STREAK] ========== STREAK UPDATE COMPLETE ==========');
    return updates;
  }
  
  // Case 2: Activity already completed today - no change to streak but increment workout count
  if (lastActivityDate === today) {
    console.log('[STREAK] Activity already completed today - incrementing workout count only');
    const updates = {
      total_workouts_completed: (user.total_workouts_completed || 0) + 1
    };
    await base44.auth.updateMe(updates);
    console.log('[STREAK] ========== STREAK UPDATE COMPLETE ==========');
    return {
      current_streak: user.current_streak || 1,
      longest_streak: user.longest_streak || 1,
      last_activity_date: today,
      total_workouts_completed: updates.total_workouts_completed
    };
  }
  
  // Case 3: Calculate day difference
  const dayDiff = getCalendarDayDifference(lastActivityDate, today);
  console.log('[STREAK] Calendar days since last activity:', dayDiff);
  
  let newStreak;
  
  if (dayDiff === 1) {
    // Consecutive day - increment streak
    newStreak = (user.current_streak || 1) + 1;
    console.log('[STREAK] Consecutive day - incrementing streak to', newStreak);
  } else if (dayDiff > 1) {
    // Missed day(s) - reset to 1
    newStreak = 1;
    console.log('[STREAK] Missed', dayDiff - 1, 'day(s) - resetting streak to 1');
  } else {
    // Shouldn't happen (negative diff or zero already handled)
    console.warn('[STREAK] Unexpected day difference:', dayDiff);
    newStreak = 1;
  }
  
  const newLongestStreak = Math.max(newStreak, user.longest_streak || 0);
  
  const updates = {
    current_streak: newStreak,
    longest_streak: newLongestStreak,
    last_activity_date: today,
    total_workouts_completed: (user.total_workouts_completed || 0) + 1
  };
  
  console.log('[STREAK] Updating user with:', updates);
  
  await base44.auth.updateMe(updates);
  
  console.log('[STREAK] ========== STREAK UPDATE COMPLETE ==========');
  return updates;
}

/**
 * Get streak status without updating
 */
export function getStreakStatus(user) {
  const today = getTodayDate();
  const lastActivityDate = user.last_activity_date;
  
  if (!lastActivityDate) {
    return {
      current: 0,
      longest: user.longest_streak || 0,
      isActiveToday: false,
      daysUntilBreak: 1
    };
  }
  
  const isActiveToday = lastActivityDate === today;
  const dayDiff = getCalendarDayDifference(lastActivityDate, today);
  
  // If last activity was yesterday, streak continues (but needs activity today to maintain)
  const daysUntilBreak = dayDiff === 0 ? 0 : dayDiff === 1 ? 0 : null; // null = already broken
  
  return {
    current: user.current_streak || 0,
    longest: user.longest_streak || 0,
    isActiveToday,
    daysUntilBreak,
    willBreakTonight: dayDiff === 1 && !isActiveToday // Last activity was yesterday, need to complete today
  };
}

/**
 * Debug: Get detailed streak information
 */
export function debugStreak(user) {
  const today = getTodayDate();
  const lastActivityDate = user.last_activity_date;
  const dayDiff = lastActivityDate ? getCalendarDayDifference(lastActivityDate, today) : null;
  
  return {
    today,
    lastActivityDate,
    dayDifference: dayDiff,
    currentStreak: user.current_streak || 0,
    longestStreak: user.longest_streak || 0,
    isActiveToday: lastActivityDate === today,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString()
  };
}