const express = require('express');
const { CheckInferenciaIA } = require('./backend/src/services/aiService');

const app = express();
const port = 3001;

app.use(express.json());

// Test endpoint that simulates a user profile
app.get('/test-alert', async (req, res) => {
  try {
    // Sample user profile data
    const userProfile = {
      id: 'test-user-1',
      name: 'Test User',
      stats: {
        currentStreak: 5,
        totalWorkouts: 20
      },
      keystoneHabits: [
        {
          id: 'habit-1',
          name: 'Morning Run',
          currentStreak: 3
        }
      ]
    };

    console.log('Testing CheckInferenciaIA with sample user data...');
    const result = await CheckInferenciaIA(userProfile);
    
    console.log('✅ AI service responded successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error('❌ Error calling CheckInferenciaIA:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
  console.log('Visit http://localhost:3001/test-alert to test the AI integration');
});