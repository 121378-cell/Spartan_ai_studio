const axios = require('axios');

// Test Ollama connection
async function testOllamaConnection() {
  try {
    console.log('Testing Ollama connection...');
    
    // Test if Ollama is running
    const response = await axios.get('http://localhost:11434/api/tags', {
      timeout: 5000
    });
    
    console.log('✅ Ollama is running');
    console.log('Available models:', response.data.models?.map(m => m.name) || 'No models listed');
    
    // Test the gemma2:2b model specifically
    const testPrompt = `Respond with exactly: "Ollama is working correctly" and nothing else.`;
    
    const generateResponse = await axios.post('http://localhost:11434/api/generate', {
      model: 'gemma2:2b',
      prompt: testPrompt,
      stream: false
    }, {
      timeout: 30000
    });
    
    if (generateResponse.data && generateResponse.data.response) {
      console.log('✅ Ollama model response:', generateResponse.data.response.trim());
    } else {
      console.log('❌ Unexpected response format from Ollama');
    }
    
  } catch (error) {
    console.error('❌ Ollama connection failed:', error.message);
    console.log('Please make sure Ollama is installed and running on your system.');
    console.log('You can download Ollama from: https://ollama.com/download');
  }
}

// Run the test
testOllamaConnection();