/**
 * Program Hierarchy System
 * 
 * Defines the complete progression path from beginner to advanced
 * All programs are organized by difficulty tier and phase
 */

export const PROGRAM_TIERS = {
  STARTER: 'starter',
  BEGINNER: 'beginner',
  PROGRESSION: 'progression',
  ADVANCED: 'advanced'
};

export const PROGRAM_PHASES = {
  // Starter Tier
  START_HERE: {
    tier: PROGRAM_TIERS.STARTER,
    name: 'Start Here - Week 1-2',
    duration_weeks: 2,
    description: 'Perfect for absolute beginners - learn the basics',
    difficulty: 'beginner',
    focus: 'Introduction to movement and building the habit',
    prerequisites: null,
    order: 1
  },
  
  // Beginner Tier
  BEGINNER_STRENGTH: {
    tier: PROGRAM_TIERS.BEGINNER,
    name: 'Beginner Strength Foundation',
    duration_weeks: 4,
    description: 'Build foundational strength and proper form',
    difficulty: 'beginner',
    focus: 'Basic bodyweight exercises and form mastery',
    prerequisites: 'START_HERE',
    order: 2
  },
  
  // Progression Tier
  INTERMEDIATE_BUILD: {
    tier: PROGRAM_TIERS.PROGRESSION,
    name: 'Intermediate Build Phase',
    duration_weeks: 8,
    description: 'Increase volume and intensity progressively',
    difficulty: 'intermediate',
    focus: 'Progressive overload and muscle building',
    prerequisites: 'BEGINNER_STRENGTH',
    order: 3
  },
  
  // Advanced Tier
  TRIMMER_FIT_300: {
    tier: PROGRAM_TIERS.ADVANCED,
    name: 'Trimmer Fit 300',
    duration_weeks: 12,
    description: 'High-intensity conditioning and strength',
    difficulty: 'advanced',
    focus: 'Maximum conditioning and performance',
    prerequisites: 'INTERMEDIATE_BUILD',
    order: 4
  },
  
  ADVANCED_ENDURANCE: {
    tier: PROGRAM_TIERS.ADVANCED,
    name: 'Advanced Endurance',
    duration_weeks: 10,
    description: 'Build elite-level cardiovascular capacity',
    difficulty: 'advanced',
    focus: 'Endurance and stamina development',
    prerequisites: 'INTERMEDIATE_BUILD',
    order: 5
  },
  
  ADVANCED_STRENGTH: {
    tier: PROGRAM_TIERS.ADVANCED,
    name: 'Advanced Strength Program',
    duration_weeks: 12,
    description: 'Maximum strength development',
    difficulty: 'advanced',
    focus: 'Heavy resistance and compound movements',
    prerequisites: 'INTERMEDIATE_BUILD',
    order: 6
  }
};

/**
 * Get recommended program for user based on their level
 */
export function getRecommendedProgram(user) {
  const totalWorkouts = user.total_workouts_completed || 0;
  const fitnessLevel = user.fitness_level || 'beginner';
  
  // True beginner - always start here
  if (totalWorkouts < 5 || fitnessLevel === 'beginner') {
    return 'START_HERE';
  }
  
  // Some experience - beginner strength
  if (totalWorkouts < 20) {
    return 'BEGINNER_STRENGTH';
  }
  
  // Experienced - progression phase
  if (totalWorkouts < 50 || fitnessLevel === 'intermediate') {
    return 'INTERMEDIATE_BUILD';
  }
  
  // Advanced users
  const goal = user.fitness_goal;
  if (goal === 'endurance') {
    return 'ADVANCED_ENDURANCE';
  } else if (goal === 'muscle_gain') {
    return 'ADVANCED_STRENGTH';
  } else {
    return 'TRIMMER_FIT_300';
  }
}

/**
 * Get all programs organized by tier
 */
export function getProgramsByTier() {
  const programs = {};
  
  Object.entries(PROGRAM_PHASES).forEach(([key, phase]) => {
    if (!programs[phase.tier]) {
      programs[phase.tier] = [];
    }
    programs[phase.tier].push({ key, ...phase });
  });
  
  // Sort each tier by order
  Object.keys(programs).forEach(tier => {
    programs[tier].sort((a, b) => a.order - b.order);
  });
  
  return programs;
}

/**
 * Check if user meets prerequisites for a program
 */
export function meetsPrerequisites(programKey, userCompletedPrograms = []) {
  const program = PROGRAM_PHASES[programKey];
  
  if (!program) return false;
  if (!program.prerequisites) return true;
  
  return userCompletedPrograms.includes(program.prerequisites);
}

/**
 * Get next recommended program after completing current one
 */
export function getNextProgram(currentProgramKey) {
  const current = PROGRAM_PHASES[currentProgramKey];
  if (!current) return null;
  
  // Find programs that have current as prerequisite
  const nextPrograms = Object.entries(PROGRAM_PHASES)
    .filter(([key, phase]) => phase.prerequisites === currentProgramKey)
    .map(([key, phase]) => ({ key, ...phase }))
    .sort((a, b) => a.order - b.order);
  
  return nextPrograms.length > 0 ? nextPrograms[0].key : null;
}

/**
 * Validate program data structure
 */
export function validateProgramStructure(program) {
  const required = ['name', 'duration_days', 'difficulty', 'daily_plans'];
  const missing = required.filter(field => !program[field]);
  
  if (missing.length > 0) {
    throw new Error(`Program missing required fields: ${missing.join(', ')}`);
  }
  
  // Validate daily plans
  if (!Array.isArray(program.daily_plans) || program.daily_plans.length === 0) {
    throw new Error('Program must have at least one daily plan');
  }
  
  return true;
}