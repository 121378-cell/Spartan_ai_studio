/**
 * Spartan Hub 2.0 - Test User Seed Script
 * 
 * Creates 2 complete test user accounts with:
 * - Full profiles
 * - 30 days of workout history
 * - 30 days of biometric data
 * - AI conversation history
 * - Achievements
 * - Simulated wearable connections
 * 
 * Usage: npx ts-node scripts/seed-test-users.ts
 */

import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DB_PATH = join(__dirname, '..', 'spartan-hub', 'backend', 'data', 'spartan.db');
const OUTPUT_FILE = join(__dirname, 'test-user-credentials.json');

// Test User Definitions
const TEST_USERS = [
  {
    id: 'test-user-001',
    email: 'test1@local.test',
    password: 'TestUser123!',
    profile: {
      name: 'Alex Tester',
      firstName: 'Alex',
      lastName: 'Tester',
      age: 30,
      fitnessLevel: 'intermediate' as const,
      primaryGoal: 'hypertrophy' as const,
      weightKg: 75,
      heightCm: 178,
      workoutFrequencyPerWeek: 4,
      preferredWorkoutTime: 'morning',
      trainingExperienceMonths: 24
    }
  },
  {
    id: 'test-user-002',
    email: 'test2@local.test',
    password: 'TestUser123!',
    profile: {
      name: 'Jordan Tester',
      firstName: 'Jordan',
      lastName: 'Tester',
      age: 25,
      fitnessLevel: 'beginner' as const,
      primaryGoal: 'fat-loss' as const,
      weightKg: 68,
      heightCm: 165,
      workoutFrequencyPerWeek: 3,
      preferredWorkoutTime: 'evening',
      trainingExperienceMonths: 6
    }
  }
];

// =============================================================================
// DATA GENERATORS
// =============================================================================

/**
 * Generate realistic workout data
 */
function generateWorkoutHistory(userId: string, days: number = 30) {
  const workouts = [];
  const workoutTypes = [
    { type: 'strength', exercises: ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'], duration: 60 },
    { type: 'cardio', exercises: ['Running', 'Cycling', 'Rowing'], duration: 45 },
    { type: 'hiit', exercises: ['Burpees', 'Mountain Climbers', 'Jump Squats'], duration: 30 },
    { type: 'yoga', exercises: ['Sun Salutation', 'Warrior Pose', 'Downward Dog'], duration: 45 },
    { type: 'mobility', exercises: ['Hip Flexor Stretch', 'Thoracic Rotation', 'Ankle Mobility'], duration: 20 }
  ];

  const now = new Date();

  for (let i = 0; i < days; i++) {
    // Skip some days randomly (rest days)
    if (Math.random() > 0.75) continue;

    const workoutDate = new Date(now);
    workoutDate.setDate(workoutDate.getDate() - i);

    const workoutType = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
    const exercises = workoutType.exercises.map(ex => ({
      name: ex,
      sets: Math.floor(Math.random() * 3) + 3,
      reps: Math.floor(Math.random() * 10) + 8,
      weight: Math.floor(Math.random() * 50) + 20
    }));

    workouts.push({
      id: uuidv4(),
      userId,
      type: workoutType.type,
      date: workoutDate.toISOString(),
      duration: workoutType.duration,
      calories: Math.floor(Math.random() * 300) + 200,
      exercises,
      completed: true,
      rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
      notes: `Workout session #${i + 1}`
    });
  }

  return workouts;
}

/**
 * Generate realistic biometric data
 */
function generateBiometricData(userId: string, days: number = 30) {
  const biometrics = [];
  const now = new Date();

  // Base values vary by user
  const baseHRV = 50 + Math.random() * 30;
  const baseRHR = 55 + Math.random() * 15;
  const baseSleepHours = 6.5 + Math.random() * 2;
  const baseSteps = 8000 + Math.random() * 4000;

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Add some variation and trends
    const dayVariation = Math.sin(i / 7 * Math.PI) * 10; // Weekly pattern
    const randomVariation = (Math.random() - 0.5) * 20;

    biometrics.push({
      id: uuidv4(),
      userId,
      date: dateStr,
      hrv: {
        value: Math.round((baseHRV + dayVariation + randomVariation) * 10) / 10,
        source: 'garmin' as const,
        timestamp: date
      },
      restingHeartRate: {
        value: Math.round(baseRHR + (dayVariation * 0.3) + (Math.random() - 0.5) * 10),
        source: 'garmin' as const,
        timestamp: date
      },
      sleep: {
        date: dateStr,
        startTime: new Date(date.setHours(22 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60))),
        endTime: new Date(date.setHours(6 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60))),
        duration: Math.round((baseSleepHours + (randomVariation * 0.1)) * 60),
        quality: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)] as any,
        source: 'garmin' as const,
        stages: {
          light: Math.floor(120 + Math.random() * 60),
          deep: Math.floor(60 + Math.random() * 40),
          rem: Math.floor(80 + Math.random() * 40),
          awake: Math.floor(10 + Math.random() * 20)
        },
        score: Math.floor(60 + Math.random() * 35)
      },
      activity: {
        date: dateStr,
        steps: Math.round(baseSteps + dayVariation * 100 + (Math.random() - 0.5) * 3000),
        caloriesBurned: Math.floor(2000 + Math.random() * 800),
        activeCalories: Math.floor(300 + Math.random() * 400),
        activityMinutes: {
          moderate: Math.floor(30 + Math.random() * 60),
          vigorous: Math.floor(10 + Math.random() * 30)
        },
        source: 'garmin' as const
      },
      stress: {
        timestamp: date,
        stressLevel: Math.floor(20 + Math.random() * 40),
        source: 'garmin' as const,
        measurementType: 'heart-rate-variability' as const
      },
      sources: new Set(['garmin']),
      lastUpdated: new Date(),
      dataCompleteness: 85 + Math.floor(Math.random() * 15)
    });
  }

  return biometrics;
}

/**
 * Generate AI coaching conversations
 */
function generateAIConversations(userId: string, count: number = 10) {
  const conversations = [];
  const topics = [
    { subject: 'workout_plan', message: 'Can you help me optimize my workout plan for hypertrophy?' },
    { subject: 'nutrition', message: 'What should I eat before and after workouts?' },
    { subject: 'recovery', message: 'I am feeling sore, should I rest or train?' },
    { subject: 'motivation', message: 'I am lacking motivation lately, any tips?' },
    { subject: 'sleep', message: 'How can I improve my sleep quality?' },
    { subject: 'progress', message: 'Am I making good progress towards my goals?' },
    { subject: 'injury_prevention', message: 'How can I prevent knee pain during squats?' },
    { subject: 'supplements', message: 'What supplements do you recommend?' },
    { subject: 'cardio', message: 'How much cardio should I do for fat loss?' },
    { subject: 'consistency', message: 'How do I stay consistent with my training?' }
  ];

  const aiResponses = [
    "Based on your current metrics and goals, I recommend focusing on progressive overload with compound movements. Your recovery score looks good, so you can handle increased intensity.",
    "Great question! For your fitness level, I suggest timing your carbohydrates around your workouts. Pre-workout: light carbs 30-60 min before. Post-workout: protein + carbs within 2 hours.",
    "Looking at your HRV and sleep data, your body is signaling a need for active recovery. Consider light mobility work or a walk instead of intense training today.",
    "Remember why you started! Your progress over the last 30 days shows consistent improvement. Let's adjust your plan to include more variety to keep things interesting.",
    "Your sleep data shows room for improvement. Try establishing a consistent bedtime routine, reducing screen time 1 hour before bed, and keeping your room cool (18-20°C).",
    "Absolutely! Your strength has increased 15% and your resting heart rate has decreased by 5 bpm. These are excellent indicators of cardiovascular and muscular adaptation.",
    "Knee pain during squats often indicates mobility limitations. Try adding ankle dorsiflexion and hip flexor stretches before squatting. Also, check your knee tracking over toes.",
    "For your goals, I recommend: 1) Whey protein for convenience, 2) Creatine monohydrate 5g daily, 3) Vitamin D3 if you have limited sun exposure. Always consult your doctor first.",
    "For fat loss, aim for 150-300 minutes of moderate cardio per week. Zone 2 training (conversational pace) is excellent for building aerobic base and fat oxidation.",
    "Consistency comes from systems, not motivation. Set specific workout times, prepare your gear the night before, and track your progress. Small wins build momentum!"
  ];

  const now = new Date();

  for (let i = 0; i < count; i++) {
    const conversationDate = new Date(now);
    conversationDate.setDate(conversationDate.getDate() - Math.floor(i * 3));

    const topic = topics[i % topics.length];
    
    conversations.push({
      id: uuidv4(),
      userId,
      timestamp: conversationDate.toISOString(),
      topic: topic.subject,
      userMessage: topic.message,
      aiResponse: aiResponses[i],
      sentiment: 'positive',
      resolved: true,
      followUpRequired: false
    });
  }

  return conversations;
}

/**
 * Generate achievements
 */
function generateAchievements(userId: string) {
  return [
    {
      id: uuidv4(),
      userId,
      name: 'First Steps',
      description: 'Complete your first workout',
      icon: '🏆',
      unlockedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'milestone'
    },
    {
      id: uuidv4(),
      userId,
      name: 'Week Warrior',
      description: 'Complete 7 consecutive days of activity',
      icon: '🔥',
      unlockedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'streak'
    },
    {
      id: uuidv4(),
      userId,
      name: 'Strength Seeker',
      description: 'Lift a total of 1000kg across all exercises',
      icon: '💪',
      unlockedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'strength'
    },
    {
      id: uuidv4(),
      userId,
      name: 'Early Bird',
      description: 'Complete 5 morning workouts',
      icon: '🌅',
      unlockedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'habit'
    },
    {
      id: uuidv4(),
      userId,
      name: 'Data Master',
      description: 'Sync biometric data for 14 consecutive days',
      icon: '📊',
      unlockedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'consistency'
    }
  ];
}

/**
 * Generate active challenges
 */
function generateChallenges(userId: string) {
  return [
    {
      id: uuidv4(),
      userId,
      name: '30-Day Strength Challenge',
      description: 'Complete 20 strength workouts in 30 days',
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 14,
      target: 20,
      status: 'active',
      reward: 'Exclusive badge and AI coaching session'
    },
    {
      id: uuidv4(),
      userId,
      name: 'Sleep Improvement Challenge',
      description: 'Achieve 7+ hours of sleep for 14 days',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 5,
      target: 14,
      status: 'active',
      reward: 'Personalized sleep optimization plan'
    },
    {
      id: uuidv4(),
      userId,
      name: 'Step Challenge',
      description: 'Average 10,000 steps daily for a week',
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 3,
      target: 7,
      status: 'active',
      reward: 'Fitness tracker discount code'
    }
  ];
}

/**
 * Generate wearable device connections
 */
function generateWearableDevices(userId: string) {
  return [
    {
      id: uuidv4(),
      userId,
      type: 'garmin' as const,
      name: 'Garmin Forerunner 955',
      model: 'Forerunner 955',
      serialNumber: 'GRM-' + uuidv4().substring(0, 8).toUpperCase(),
      connectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastSyncAt: new Date().toISOString(),
      isActive: true,
      permissions: {
        hrv: true,
        rhr: true,
        sleep: true,
        activity: true,
        stress: true,
        bodyMetrics: true
      },
      syncStatus: 'synced' as const
    },
    {
      id: uuidv4(),
      userId,
      type: 'apple-health' as const,
      name: 'Apple Health',
      model: 'iPhone Health App',
      connectedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      lastSyncAt: new Date().toISOString(),
      isActive: true,
      permissions: {
        hrv: true,
        rhr: true,
        sleep: true,
        activity: true,
        stress: false,
        bodyMetrics: true
      },
      syncStatus: 'synced' as const
    }
  ];
}

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function seedTestUsers() {
  console.log('🚀 Spartan Hub 2.0 - Test User Seed Script');
  console.log('==========================================\n');

  const seedData = {
    users: [],
    workouts: [] as any[],
    biometrics: [] as any[],
    conversations: [] as any[],
    achievements: [] as any[],
    challenges: [] as any[],
    wearables: [] as any[]
  };

  for (const userData of TEST_USERS) {
    console.log(`📝 Creating user: ${userData.profile.name} (${userData.email})`);

    // Create user profile
    const user = {
      id: userData.id,
      email: userData.email,
      password: userData.password, // In real app, this would be hashed
      name: userData.profile.name,
      role: 'user',
      quest: 'Fitness Transformation',
      stats: {
        totalWorkouts: 0,
        currentStreak: 7,
        joinDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      onboardingCompleted: true,
      keystoneHabits: [
        {
          id: uuidv4(),
          name: 'Morning Workout',
          anchor: 'After waking up',
          currentStreak: 7,
          longestStreak: 12,
          notificationTime: '07:00'
        },
        {
          id: uuidv4(),
          name: 'Protein Intake',
          anchor: 'After each meal',
          currentStreak: 15,
          longestStreak: 20,
          notificationTime: '12:00'
        }
      ],
      masterRegulationSettings: {
        targetBedtime: '22:30'
      },
      nutritionSettings: {
        priority: 'performance' as const,
        calorieGoal: userData.profile.fitnessLevel === 'beginner' ? 2000 : 2500,
        proteinGoal: userData.profile.fitnessLevel === 'beginner' ? 120 : 160
      },
      isInAutonomyPhase: false,
      weightKg: userData.profile.weightKg,
      detailedProfile: {
        firstName: userData.profile.firstName,
        lastName: userData.profile.lastName,
        dateOfBirth: new Date(new Date().setFullYear(new Date().getFullYear() - userData.profile.age)).toISOString(),
        gender: 'prefer-not-to-say' as const,
        heightCm: userData.profile.heightCm,
        fitnessLevel: userData.profile.fitnessLevel,
        primaryGoal: userData.profile.primaryGoal,
        workoutFrequencyPerWeek: userData.profile.workoutFrequencyPerWeek,
        preferredWorkoutTime: userData.profile.preferredWorkoutTime,
        trainingExperienceMonths: userData.profile.trainingExperienceMonths
      },
      preferences: {
        theme: 'dark' as const,
        language: 'en',
        dateFormat: 'MM/DD/YYYY' as const,
        timeFormat: '24h' as const,
        units: 'metric' as const,
        notifications: {
          email: { enabled: true, workoutReminders: true, progressReports: true, communityActivities: false, marketing: false },
          push: { enabled: true, workoutReminders: true, progressReports: true, communityActivities: false },
          sms: { enabled: false, workoutReminders: false, urgentNotifications: true }
        },
        privacy: {
          profileVisibility: 'friends' as const,
          showWorkoutStats: true,
          showProgressPhotos: false,
          shareWithCommunity: false,
          allowFriendRequests: true
        },
        fitness: {
          workoutIntensity: userData.profile.fitnessLevel === 'beginner' ? 'low' : 'medium' as any,
          preferredWorkoutTime: userData.profile.preferredWorkoutTime as any,
          restDaysPerWeek: 2,
          autoGenerateWorkouts: true,
          receiveExerciseTips: true
        },
        nutrition: {
          trackCalories: true,
          trackMacros: true,
          mealPlanning: false,
          recipeSuggestions: true,
          dietaryRestrictions: []
        },
        appBehavior: {
          autoSaveWorkouts: true,
          remindToLogWorkouts: true,
          syncDataInBackground: true,
          enableBiometricAuth: false,
          showOnboardingTips: true
        }
      },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    };

    seedData.users.push(user);

    // Generate related data
    const workouts = generateWorkoutHistory(userData.id);
    const biometrics = generateBiometricData(userData.id);
    const conversations = generateAIConversations(userData.id);
    const achievements = generateAchievements(userData.id);
    const challenges = generateChallenges(userData.id);
    const wearables = generateWearableDevices(userData.id);

    seedData.workouts.push(...workouts);
    seedData.biometrics.push(...biometrics);
    seedData.conversations.push(...conversations);
    seedData.achievements.push(...achievements);
    seedData.challenges.push(...challenges);
    seedData.wearables.push(...wearables);

    console.log(`   ✅ ${workouts.length} workouts generated`);
    console.log(`   ✅ ${biometrics.length} days of biometrics generated`);
    console.log(`   ✅ ${conversations.length} AI conversations generated`);
    console.log(`   ✅ ${achievements.length} achievements unlocked`);
    console.log(`   ✅ ${challenges.length} active challenges`);
    console.log(`   ✅ ${wearables.length} wearable devices connected`);
    console.log('');
  }

  // Save credentials to file
  const credentials = {
    testUsers: TEST_USERS.map(u => ({
      email: u.email,
      password: u.password,
      profile: u.profile
    })),
    generatedAt: new Date().toISOString(),
    environment: 'local-test'
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(credentials, null, 2));
  console.log(`📄 Test credentials saved to: ${OUTPUT_FILE}`);

  // Save seed data as JSON for database import
  const seedFile = join(__dirname, 'seed-data.json');
  writeFileSync(seedFile, JSON.stringify(seedData, null, 2));
  console.log(`📦 Seed data saved to: ${seedFile}`);

  console.log('\n✅ Seed script completed successfully!');
  console.log('\n📋 Quick Reference:');
  console.log('   User 1: test1@local.test / TestUser123!');
  console.log('   User 2: test2@local.test / TestUser123!');
  console.log('\n🔗 Next Steps:');
  console.log('   1. Start Docker services: docker-compose -f docker-compose.local-test.yml up -d');
  console.log('   2. Run seed script: npx ts-node scripts/seed-test-users.ts');
  console.log('   3. Access frontend: http://localhost:5173');
  console.log('   4. Login with test credentials above');
}

// Run the seed script
seedTestUsers().catch(console.error);
