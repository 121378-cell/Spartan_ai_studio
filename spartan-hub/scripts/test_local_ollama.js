const axios = require('axios');

async function testLocalOllamaConnection() {
  try {
    // Test if Ollama is running and accessible
    const response = await axios.get('http://localhost:11434/api/tags');
    console.log('✅ Successfully connected to Ollama!');
    console.log('Available models:');
    response.data.models.forEach(model => {
      console.log(`  - ${model.name}`);
    });
    
    // Test the gemma2 model with a simple prompt
    console.log('\nTesting gemma2 model with a simple prompt...');
    try {
      const promptResponse = await axios.post('http://localhost:11434/api/generate', {
        model: 'gemma2:2b',
        prompt: 'Hello, what model are you? Respond in one sentence.',
        stream: false
      });
      
      console.log('✅ Gemma2 model responded successfully!');
      console.log('Response:', promptResponse.data.response.trim());
    } catch (promptError) {
      console.error('❌ Error with gemma2 model:', promptError.message);
      if (promptError.response) {
        console.error('Response data:', promptError.response.data);
        console.error('Status code:', promptError.response.status);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to connect to Ollama:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Tip: Make sure Ollama is running. You can start it from the system tray icon or run "ollama serve"');
    }
  }
}

testLocalOllamaConnection();