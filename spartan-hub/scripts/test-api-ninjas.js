require('dotenv').config();
const axios = require('axios');

async function testApiNinjas() {
  console.log('Testing API Ninjas key...');
  
  try {
    const response = await axios.get('https://api.api-ninjas.com/v1/exercises', {
      headers: {
        'X-Api-Key': process.env.API_NINJAS_KEY
      },
      params: {
        muscle: 'biceps'
      }
    });
    
    console.log('✅ API Ninjas key is working!');
    console.log(`Found ${response.data.length} bicep exercises`);
    if (response.data.length > 0) {
      console.log(`First exercise: ${response.data[0].name}`);
    }
  } catch (error) {
    console.log('❌ API Ninjas key is not working');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`Error: ${error.message}`);
    }
  }
}

testApiNinjas();