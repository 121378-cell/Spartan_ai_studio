const axios = require('axios');

// AI service URL - using localhost for direct connection
const OLLAMA_SERVICE_URL = 'http://localhost:11434';

// Interface for the AI input data
function prepareAiInput(data) {
  // Extract relevant data from user profile
  // These are placeholder values - in a real implementation, you would
  // calculate these values based on the user's actual data
  
  // Recovery score: 0-100 scale (higher is better)
  const recoveryScore = data.stats ? 
    Math.min(100, Math.max(0, (data.stats.currentStreak / 7) * 100)) : 50;
  
  // Habit adherence: 1-5 scale (higher is better)
  const habitAdherence = data.keystoneHabits && data.keystoneHabits.length > 0 ?
    Math.min(5, Math.max(1, data.keystoneHabits[0].currentStreak / 2)) : 3;
  
  // Stress level: 1-10 scale (higher is worse)
  // This would typically come from user input or calculated from other metrics
  const stressLevel = 5;
  
  // Sleep quality: 1-5 scale (higher is better)
  // This would typically come from user input or calculated from other metrics
  const sleepQuality = 3;
  
  // Workout frequency: 0-7 times per week
  const workoutFrequency = data.stats ? 
    Math.min(7, data.stats.totalWorkouts / 4) : 3;
  
  return {
    recovery_score: recoveryScore,
    habit_adherence: habitAdherence,
    stress_level: stressLevel,
    sleep_quality: sleepQuality,
    workout_frequency: workoutFrequency
  };
}

// Apply fallback mechanism for AI service failures
function applyFallback(errorMessage) {
  console.warn('AI service fallback activated:', errorMessage);
  
  return {
    alerta_roja: false, // Assume no alert to maintain functionality
    processing_time_ms: 0,
    fallback_used: true,
    error: errorMessage
  };
}

// CheckInferenciaIA function - Calls the Ollama service to get an alert prediction
// Includes fallback mechanism if the Ollama service is not available
async function CheckInferenciaIA(data) {
  // Prepare the input data for the AI model
  const aiInput = prepareAiInput(data);
  
  try {
    // Create a prompt for the LLM to analyze the data and predict an alert
    const prompt = `
Eres 'VITALIS SynergyCoach', un agente de IA especializado en la predicción de alertas para programas de fitness.

**Datos del Usuario:**
${JSON.stringify(aiInput, null, 2)}

**Instrucciones:**
Basándote en los datos proporcionados, determina si es necesario activar una alerta roja para este usuario. 
Considera los siguientes factores:
- Bajo puntaje de recuperación (recovery_score < 30)
- Baja adherencia a hábitos (habit_adherence < 2)
- Alto nivel de estrés (stress_level > 8)
- Mala calidad de sueño (sleep_quality < 2)
- Frecuencia de entrenamiento inadecuada (workout_frequency = 0 o > 6)

**Formato de Salida Requerido:**
Debes responder EXCLUSIVAMENTE en formato JSON válido con los siguientes campos:
{
  "alerta_roja": true/false,
  "processing_time_ms": 0
}

**Importante:**
- No incluyas ningún texto adicional fuera del JSON
- Asegúrate de que el JSON sea válido y parseable
- Solo activa alerta_roja si hay una necesidad crítica de intervención

Respuesta en formato JSON:
`;

    // Prepare the request payload for Ollama API
    const payload = {
      model: "gemma2:2b", // Lightweight model for low-memory systems
      prompt: prompt,
      stream: false,
      format: "json" // Request JSON output format
    };

    // Record start time for processing time calculation
    const startTime = Date.now();

    // Make HTTP request to the Ollama container
    const response = await axios.post(
      `${OLLAMA_SERVICE_URL}/api/generate`,
      payload,
      {
        timeout: 10000, // 10 second timeout for LLM processing
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Parse the response to extract the JSON output
    if (response.data && response.data.response) {
      try {
        // Clean the response text to ensure valid JSON
        const cleanResponse = response.data.response.trim();
        
        // Validate that response starts and ends with braces for JSON object
        if (cleanResponse.startsWith('{') && cleanResponse.endsWith('}')) {
          const aiResponse = JSON.parse(cleanResponse);
          
          // Validate that the response has the required fields
          if (typeof aiResponse.alerta_roja === 'boolean' && 
              typeof aiResponse.processing_time_ms === 'number') {
            return {
              alerta_roja: aiResponse.alerta_roja,
              processing_time_ms: aiResponse.processing_time_ms,
              fallback_used: false
            };
          } else {
            // Log invalid response structure
            console.warn('Invalid response structure from Ollama service:', cleanResponse);
          }
        } else {
          // Log invalid JSON format
          console.warn('Invalid JSON format from Ollama service:', cleanResponse);
        }
      } catch (parseError) {
        // Log JSON parsing error with the actual response
        console.error('Error parsing LLM response as JSON:', response.data.response);
        console.error('Parse error details:', parseError);
      }
    } else {
      // Log invalid response
      console.warn('Invalid response from Ollama service:', response.data);
    }

    // If we get here, there was an issue with the response format
    // Apply fallback mechanism
    console.warn('Applying fallback due to invalid response from Ollama service');
    return applyFallback('Invalid response format from Ollama service');
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Ollama service error:', error);
    
    // Apply fallback mechanism
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return applyFallback(`Ollama service error: ${errorMessage}`);
  }
}

// Test the AI service
async function testAiService() {
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
    
  } catch (error) {
    console.error('❌ Error calling CheckInferenciaIA:', error.message);
  }
}

testAiService();