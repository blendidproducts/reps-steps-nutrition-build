import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Define all duplicate mappings
    const mergeRules = [
      {
        duplicateIds: ['68c0eb1debaaf9c07e79f975'],
        correctId: '69450b38137ff109194fd516',
        correctName: 'Single Leg Glute Bridge'
      },
      {
        duplicateIds: ['68e721be08027b8688ecdcd8', '68e5ff74027b06d48b761358', '68e5fd282e591069c3c39b7a'],
        correctId: '69450b52921aaaca6f32fb79',
        correctName: 'Single Leg Squats (Pistol Squats)'
      }
    ];
    
    let totalWorkoutsUpdated = 0;
    let totalDuplicatesDeleted = 0;

    for (const rule of mergeRules) {
      // Update all Workout entities
      const workouts = await base44.asServiceRole.entities.Workout.list();
      
      for (const workout of workouts) {
        let hasChanges = false;
        const updatedExercises = workout.exercises.map(ex => {
          if (rule.duplicateIds.includes(ex.exercise_id)) {
            hasChanges = true;
            return {
              ...ex,
              exercise_id: rule.correctId,
              exercise_name: rule.correctName
            };
          }
          return ex;
        });
        
        if (hasChanges) {
          await base44.asServiceRole.entities.Workout.update(workout.id, {
            exercises: updatedExercises
          });
          totalWorkoutsUpdated++;
        }
      }
      
      // Delete duplicate exercises (they're already marked as deleted)
      totalDuplicatesDeleted += rule.duplicateIds.length;
    }
    
    return Response.json({
      success: true,
      workoutsUpdated: totalWorkoutsUpdated,
      duplicatesRemoved: totalDuplicatesDeleted,
      message: 'All duplicate exercises merged successfully'
    });
    
  } catch (error) {
    console.error('Merge failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});