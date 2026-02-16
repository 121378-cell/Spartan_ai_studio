const axios = require('axios');

async function testAiService() {
  try {
    // Test data
    const testData = {
      name: "test",
      stats: {
        currentStreak: 5,
        totalWorkouts: 20
      },
      keystoneHabits: [
        {
          currentStreak: 3
        }
      ]
    };

    console.log('Testing AI service with data:', JSON.stringify(testData, null, 2));

    // Make request to AI service
    const response = await axios.post('http://localhost:3001/ai/alert', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('AI service response:', response.data);
  } catch (error) {
    console.error('Error testing AI service:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testAiService();