import { UserModel } from '../models/User';

async function comprehensiveTestActivity() {
  try {
    console.log('Testing comprehensive user activity functionality...');
    
    // First, create a test user
    console.log('Creating test user...');
    const testUser = await UserModel.create({
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      quest: 'Become stronger',
      stats: {
        totalWorkouts: 0,
        currentStreak: 0,
        joinDate: new Date().toISOString()
      },
      onboardingCompleted: true,
      keystoneHabits: [],
      masterRegulationSettings: {
        targetBedtime: '22:00'
      },
      nutritionSettings: {
        priority: 'performance'
      },
      isInAutonomyPhase: false,
      role: 'user'
    });
    
    console.log('Created test user:', testUser.id);
    
    // Create a test activity for the user
    console.log('Creating test activity...');
    const activity = await UserModel.addActivity({
      userId: testUser.id,
      type: 'workout_completed',
      description: 'Completed upper body workout',
      metadata: {
        workoutId: 'workout-123',
        duration: 45,
        exercises: ['bench_press', 'pull_ups', 'shoulder_press']
      }
    });
    
    console.log('Created activity:', activity);
    
    // Create another activity
    console.log('Creating second test activity...');
    const activity2 = await UserModel.addActivity({
      userId: testUser.id,
      type: 'goal_set',
      description: 'Set new strength goal',
      metadata: {
        goalType: 'strength',
        target: 'Increase bench press by 10kg',
        deadline: '2023-12-31'
      }
    });
    
    console.log('Created second activity:', activity2);
    
    // Get activity history
    console.log('Fetching activity history...');
    const history = await UserModel.getActivityHistory(testUser.id, 10);
    console.log('Activity history count:', history.length);
    console.log('First activity in history:', history[0]);
    console.log('Second activity in history:', history[1]);
    
    // Get specific activity
    console.log('Fetching specific activity...');
    const fetchedActivity = await UserModel.getActivityById(activity.id);
    console.log('Fetched activity:', fetchedActivity);
    
    console.log('Comprehensive test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

comprehensiveTestActivity();