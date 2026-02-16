import { UserModel } from '@/models/User';
import { RoutineModel } from '@/models/Routine';

async function test() {
  // Generate a unique email for testing
  const uniqueEmail = `test.${Date.now()}@example.com`;
  
  // Create a test user
  const user = await UserModel.create({
    name: 'Test User',
    email: uniqueEmail,
    password: 'testpassword', // Add password field
    quest: 'Get fit',
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

  console.log('Created user:', user);

  // Create a test routine
  const routine = await RoutineModel.create({
    name: 'Test Routine',
    focus: 'strength',
    duration: 60,
    userId: user.id,
    blocks: [
      {
        name: 'Warm-up',
        exercises: [
          {
            name: 'Jumping Jacks',
            sets: 1,
            reps: '10'
          }
        ]
      }
    ]
  });

  console.log('Created routine:', routine);
}

test();
