import { base44 } from '@/api/base44Client';

// Achievement definitions with your uploaded badge images
export const ACHIEVEMENT_DEFINITIONS = {
  // INITIATION TRACK
  getting_started: {
    achievement_type: 'getting_started',
    title: 'Getting Started',
    description: 'Complete your first workout',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/bcd0ce995_ChatGPTImageFeb15202610_37_12PM.png',
    target: 1,
    category: 'initiation',
    is_hidden: false,
    prerequisites: []
  },
  first_steps: {
    achievement_type: 'first_steps',
    title: 'First Steps',
    description: 'Complete 3 workouts',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/178b6902d_ChatGPTImageFeb15202610_36_10PM.png',
    target: 3,
    category: 'initiation',
    is_hidden: false,
    prerequisites: []
  },
  committed: {
    achievement_type: 'committed',
    title: 'Committed',
    description: 'Complete 7 workouts',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/a680641a9_ChatGPTImageFeb15202610_49_03PM.png',
    target: 7,
    category: 'initiation',
    is_hidden: false,
    prerequisites: []
  },
  dedicated: {
    achievement_type: 'dedicated',
    title: 'Dedicated',
    description: 'Complete 14 workouts',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/67ff42158_ChatGPTImageFeb15202610_50_09PM.png',
    target: 14,
    category: 'initiation',
    is_hidden: false,
    prerequisites: []
  },

  // CONSISTENCY TRACK
  week_warrior: {
    achievement_type: 'week_warrior',
    title: 'Week Warrior',
    description: '7 consecutive days OR 5 workouts in 7 days',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/943b49b73_ChatGPTImageFeb15202610_51_43PM.png',
    target: 7,
    category: 'consistency',
    is_hidden: false,
    prerequisites: []
  },
  monthly_master: {
    achievement_type: 'monthly_master',
    title: 'Monthly Master',
    description: '20+ workouts in 30 days',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/99a6d92cf_ChatGPTImageFeb15202610_52_50PM.png',
    target: 20,
    category: 'consistency',
    is_hidden: false,
    prerequisites: []
  },
  century_champion: {
    achievement_type: 'century_champion',
    title: 'Century Champion',
    description: '100 total workouts',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/1a78b3f94_ChatGPTImageFeb15202610_53_42PM.png',
    target: 100,
    category: 'consistency',
    is_hidden: false,
    prerequisites: []
  },

  // VOLUME TRACK (REP DOMINANCE)
  rep_master: {
    achievement_type: 'rep_master',
    title: 'Rep Master',
    description: '5,000 total reps',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/88b1e6ff7_ChatGPTImageFeb15202610_54_33PM.png',
    target: 5000,
    category: 'volume',
    is_hidden: false,
    prerequisites: []
  },
  rep_king: {
    achievement_type: 'rep_king',
    title: 'Rep King',
    description: '25,000 total reps',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/169d5eb08_ChatGPTImageFeb15202610_55_57PM.png',
    target: 25000,
    category: 'volume',
    is_hidden: false,
    prerequisites: []
  },
  rep_legend: {
    achievement_type: 'rep_legend',
    title: 'Rep Legend',
    description: '100,000 total reps',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/7dfc8aebb_ChatGPTImageFeb15202610_56_44PM.png',
    target: 100000,
    category: 'volume',
    is_hidden: false,
    prerequisites: []
  },

  // TIME IDENTITY TRACK
  early_bird: {
    achievement_type: 'early_bird',
    title: 'Early Bird',
    description: '10 workouts logged before 8AM',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/f60ef7773_ChatGPTImageFeb15202610_57_50PM.png',
    target: 10,
    category: 'time_identity',
    is_hidden: false,
    prerequisites: []
  },
  night_owl: {
    achievement_type: 'night_owl',
    title: 'Night Owl',
    description: '10 workouts logged after 8PM',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/82d3316f2_ChatGPTImageFeb15202610_58_38PM.png',
    target: 10,
    category: 'time_identity',
    is_hidden: false,
    prerequisites: []
  },

  // ELITE PATH (Hidden until prerequisites met)
  iron_consistency: {
    achievement_type: 'iron_consistency',
    title: 'Iron Consistency',
    description: '250 total workouts',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/037cf876c_ChatGPTImageFeb15202611_17_16PM.png',
    target: 250,
    category: 'elite',
    is_hidden: true,
    prerequisites: ['monthly_master', 'rep_master']
  },
  rep_titan: {
    achievement_type: 'rep_titan',
    title: 'Rep Titan',
    description: '250,000 total reps',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/037cf876c_ChatGPTImageFeb15202611_17_16PM.png',
    target: 250000,
    category: 'elite',
    is_hidden: true,
    prerequisites: ['monthly_master', 'rep_master']
  },
  unbreakable: {
    achievement_type: 'unbreakable',
    title: 'Unbreakable',
    description: '365-day active streak',
    icon_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/037cf876c_ChatGPTImageFeb15202611_17_16PM.png',
    target: 365,
    category: 'elite',
    is_hidden: true,
    prerequisites: ['monthly_master', 'rep_master']
  }
};

export class AchievementManager {
  static async initializeUserAchievements(userEmail) {
    // Create all achievement records for new user
    const achievements = Object.values(ACHIEVEMENT_DEFINITIONS);
    const existingAchievements = await base44.entities.Achievement.filter({ created_by: userEmail });
    
    if (existingAchievements.length === 0) {
      const achievementRecords = achievements.map(def => ({
        ...def,
        progress: 0,
        earned_date: null
      }));
      await base44.entities.Achievement.bulkCreate(achievementRecords);
    }
  }

  static async checkAndAwardAchievements(userEmail) {
    const newlyEarned = [];
    
    // Get all workout sessions
    const sessions = await base44.entities.WorkoutSession.filter({ created_by: userEmail });
    
    // Get user data for streak
    const user = await base44.auth.me();
    
    // Calculate totals
    const totalWorkouts = sessions.length;
    const totalReps = sessions.reduce((sum, s) => sum + (s.total_reps || 0), 0);
    const currentStreak = user.current_streak || 0;
    
    // Time-based workouts
    const earlyBirdWorkouts = sessions.filter(s => {
      const hour = new Date(s.start_time).getHours();
      return hour < 8;
    }).length;
    
    const nightOwlWorkouts = sessions.filter(s => {
      const hour = new Date(s.start_time).getHours();
      return hour >= 20;
    }).length;
    
    // Check 30-day consistency
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30DaysWorkouts = sessions.filter(s => new Date(s.start_time) >= thirtyDaysAgo).length;
    
    // Get all user achievements
    const achievements = await base44.entities.Achievement.filter({ created_by: userEmail });
    
    // Check each achievement type
    const checks = [
      { type: 'getting_started', value: totalWorkouts },
      { type: 'first_steps', value: totalWorkouts },
      { type: 'committed', value: totalWorkouts },
      { type: 'dedicated', value: totalWorkouts },
      { type: 'week_warrior', value: currentStreak },
      { type: 'monthly_master', value: last30DaysWorkouts },
      { type: 'century_champion', value: totalWorkouts },
      { type: 'rep_master', value: totalReps },
      { type: 'rep_king', value: totalReps },
      { type: 'rep_legend', value: totalReps },
      { type: 'early_bird', value: earlyBirdWorkouts },
      { type: 'night_owl', value: nightOwlWorkouts },
      { type: 'iron_consistency', value: totalWorkouts },
      { type: 'rep_titan', value: totalReps },
      { type: 'unbreakable', value: currentStreak }
    ];
    
    for (const check of checks) {
      const achievement = achievements.find(a => a.achievement_type === check.type);
      if (!achievement) continue;
      
      const def = ACHIEVEMENT_DEFINITIONS[check.type];
      
      // Check if hidden badge prerequisites are met
      if (def.is_hidden && def.prerequisites.length > 0) {
        const prereqsMet = def.prerequisites.every(prereq => {
          const prereqAch = achievements.find(a => a.achievement_type === prereq);
          return prereqAch && prereqAch.earned_date;
        });
        
        if (!prereqsMet) {
          continue; // Skip this achievement
        }
      }
      
      // Update progress
      await base44.entities.Achievement.update(achievement.id, {
        progress: check.value
      });
      
      // Check if earned
      if (check.value >= def.target && !achievement.earned_date) {
        await base44.entities.Achievement.update(achievement.id, {
          earned_date: new Date().toISOString()
        });
        newlyEarned.push(def);
      }
    }
    
    return newlyEarned;
  }

  static async getAchievementProgress(userEmail) {
    const achievements = await base44.entities.Achievement.filter({ created_by: userEmail });
    
    // Check if hidden badges should be revealed
    const earnedTypes = achievements.filter(a => a.earned_date).map(a => a.achievement_type);
    const monthlyMasterEarned = earnedTypes.includes('monthly_master');
    const repMasterEarned = earnedTypes.includes('rep_master');
    const eliteUnlocked = monthlyMasterEarned && repMasterEarned;
    
    return achievements.map(achievement => {
      const def = ACHIEVEMENT_DEFINITIONS[achievement.achievement_type];
      const shouldShow = !def.is_hidden || eliteUnlocked;
      
      return {
        ...achievement,
        ...def,
        progress_percentage: Math.min(100, (achievement.progress / def.target) * 100),
        is_visible: shouldShow
      };
    });
  }
}