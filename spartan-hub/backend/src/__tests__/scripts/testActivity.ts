import { UserModel } from '@/models/User';

async function testActivity() {
  try {
    console.log('Testing user activity functionality...');
    
    // Create a test activity
    const activity = await UserModel.addActivity({
      userId: 'test-user-id',
      type: 'workout_completed',
      description: 'Completed upper body workout',
      metadata: {
        workoutId: 'workout-123',
        duration: 45,
        exercises: ['bench_press', 'pull_ups', 'shoulder_press']
      }
    });
    
    console.log('Created activity:', activity);
    
    // Get activity history
    const history = await UserModel.getActivityHistory('test-user-id', 10);
    console.log('Activity history:', history);
    
    // Get specific activity
    const fetchedActivity = await UserModel.getActivityById(activity.id);
    console.log('Fetched activity:', fetchedActivity);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testActivity();