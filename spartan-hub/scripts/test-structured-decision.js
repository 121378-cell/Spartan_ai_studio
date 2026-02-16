const axios = require('axios');

async function testStructuredDecision() {
  try {
    // Test data
    const testData = {
      PartituraSemanal: {
        "lunes": "Entrenamiento de fuerza",
        "martes": "Cardio",
        "miércoles": "Descanso",
        "jueves": "Entrenamiento de fuerza",
        "viernes": "Cardio",
        "sábado": "Descanso",
        "domingo": "Descanso"
      },
      Causa: "El usuario ha estado muy estresado esta semana",
      PuntajeSinergico: 75
    };

    console.log('Testing structured decision with data:', JSON.stringify(testData, null, 2));

    // Make request to AI service
    const response = await axios.post('http://localhost:3001/ai/decision/test-user', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Structured decision response:', response.data);
  } catch (error) {
    console.error('Error testing structured decision:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testStructuredDecision();