import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const duplicateId = '68c0eb1debaaf9c07e79f975'; // Single Leg Glute Bridges (no image)
    const correctId = '69450b38137ff109194fd516'; // Single Leg Glute Bridge (with image)
    
    // Update all Workout entities
    const workouts = await base44.asServiceRole.entities.Workout.filter({
      'exercises.exercise_id': duplicateId
    });
    
    let workoutsUpdated = 0;
    for (const workout of workouts) {
      const updatedExercises = workout.exercises.map(ex => {
        if (ex.exercise_id === duplicateId) {
          return {
            ...ex,
            exercise_id: correctId,
            exercise_name: 'Single Leg Glute Bridge'
          };
        }
        return ex;
      });
      
      await base44.asServiceRole.entities.Workout.update(workout.id, {
        exercises: updatedExercises
      });
      workoutsUpdated++;
    }
    
    // Delete the duplicate exercise
    await base44.asServiceRole.entities.Exercise.delete(duplicateId);
    
    return Response.json({
      success: true,
      workoutsUpdated,
      message: 'Duplicate exercise merged and deleted successfully'
    });
    
  } catch (error) {
    console.error('Merge failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});