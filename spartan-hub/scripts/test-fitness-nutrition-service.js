require('dotenv').config();

const { searchExercisesByMuscle, searchExercisesByName, getNutritionInfo, generateWorkoutPlan, getExerciseRecommendations } = require('../src/services/fitnessNutritionService');

async function testFitnessNutritionService() {
  console.log('Testing Fitness and Nutrition Service...\n');
  
  // Show which APIs are configured
  console.log('Configured APIs:');
  console.log('  API Ninjas:', process.env.API_NINJAS_KEY ? '✓' : '✗');
  console.log('  Edamam:', process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY ? '✓' : '✗');
  console.log('  FatSecret:', process.env.FATSECRET_KEY && process.env.FATSECRET_SECRET ? '✓' : '✗');
  console.log('  ExerciseDB:', process.env.EXERCISEDB_KEY ? '✓' : '✗');
  console.log('');
  
  // Test 1: Search exercises by muscle group
  console.log('1. Testing searchExercisesByMuscle (biceps):');
  try {
    const bicepExercises = await searchExercisesByMuscle('biceps');
    console.log(`   Found ${bicepExercises.length} bicep exercises`);
    if (bicepExercises.length > 0) {
      console.log(`   First exercise: ${bicepExercises[0].name}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 2: Search exercises by name
  console.log('\n2. Testing searchExercisesByName (press):');
  try {
    const pressExercises = await searchExercisesByName('press');
    console.log(`   Found ${pressExercises.length} exercises with "press" in the name`);
    if (pressExercises.length > 0) {
      console.log(`   First exercise: ${pressExercises[0].name}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 3: Get nutrition info
  console.log('\n3. Testing getNutritionInfo:');
  try {
    const nutritionInfo = await getNutritionInfo(['100g chicken breast', '1 apple']);
    console.log(`   Got nutrition info for ${nutritionInfo.length} items`);
    nutritionInfo.forEach(item => {
      console.log(`   - ${item.foodName}: ${item.calories} calories`);
    });
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 4: Generate workout plan
  console.log('\n4. Testing generateWorkoutPlan:');
  try {
    const workoutPlan = await generateWorkoutPlan({ focus: 'strength', duration: '45 minutes' });
    console.log(`   Generated workout plan: ${workoutPlan.name}`);
    console.log(`   Duration: ${workoutPlan.duration}`);
    console.log(`   Focus: ${workoutPlan.focus}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 5: Get exercise recommendations
  console.log('\n5. Testing getExerciseRecommendations:');
  try {
    const userProfile = {
      trainingCycle: {
        phase: 'strength'
      }
    };
    const recommendations = await getExerciseRecommendations(userProfile);
    console.log(`   Got ${recommendations.length} exercise recommendations`);
    if (recommendations.length > 0) {
      console.log(`   First recommendation: ${recommendations[0].name}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n✅ Fitness and Nutrition Service tests completed!');
}

// Run the tests
testFitnessNutritionService();