const axios = require('axios');

async function testFitnessPrompt() {
  try {
    // Sample user data that would be sent to the AI
    const aiInput = {
      recovery_score: 45,
      habit_adherence: 3,
      stress_level: 7,
      sleep_quality: 2,
      workout_frequency: 4
    };

    // Create the prompt that the application would send
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

    console.log('Testing fitness prompt with gemma2 model...');
    
    const startTime = Date.now();
    const promptResponse = await axios.post('http://localhost:11434/api/generate', {
      model: 'gemma2:2b',
      prompt: prompt,
      stream: false,
      format: 'json'
    });
    const processingTime = Date.now() - startTime;
    
    console.log('✅ Gemma2 model responded successfully!');
    console.log('Processing time:', processingTime, 'ms');
    console.log('Raw response:', promptResponse.data.response);
    
    // Try to parse the response as JSON
    try {
      const jsonResponse = JSON.parse(promptResponse.data.response.trim());
      console.log('✅ Successfully parsed JSON response:');
      console.log(JSON.stringify(jsonResponse, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError.message);
      console.log('Response content:', promptResponse.data.response);
    }
    
  } catch (error) {
    console.error('❌ Error testing fitness prompt:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
    }
  }
}

testFitnessPrompt();