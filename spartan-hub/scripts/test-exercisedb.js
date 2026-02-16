require('dotenv').config();
const axios = require('axios');

async function testExerciseDB() {
  console.log('Testing ExerciseDB key...');
  
  if (!process.env.EXERCISEDB_KEY) {
    console.log('⚠ ExerciseDB key not configured');
    return false;
  }
  
  try {
    const response = await axios.get('https://exercisedb.p.rapidapi.com/exercises/bodyPart/chest', {
      headers: {
        'X-RapidAPI-Key': process.env.EXERCISEDB_KEY,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
      }
    });
    
    console.log('✅ ExerciseDB: Working');
    console.log(`   Found ${response.data.length} chest exercises`);
    if (response.data.length > 0) {
      console.log(`   First exercise: ${response.data[0].name}`);
    }
    return true;
  } catch (error) {
    console.log('❌ ExerciseDB: Not working');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

testExerciseDB();