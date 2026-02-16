// Final test to demonstrate that the local Ollama connection is working
const axios = require('axios');

async function finalTest() {
  console.log('🚀 Final Test: Local Ollama Connection');
  console.log('=====================================');
  
  try {
    // 1. Check if Ollama is running
    console.log('1. Checking Ollama service...');
    const healthCheck = await axios.get('http://localhost:11434/api/tags');
    console.log('   ✅ Ollama is running and accessible');
    
    // 2. Check if required model is available
    console.log('2. Checking for gemma2:2b model...');
    const models = healthCheck.data.models;
    const hasModel = models.some(model => model.name === 'gemma2:2b');
    if (hasModel) {
      console.log('   ✅ gemma2:2b model is available');
    } else {
      console.log('   ❌ gemma2:2b model not found');
      return;
    }
    
    // 3. Test AI service with a simple prompt
    console.log('3. Testing AI response...');
    const startTime = Date.now();
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'gemma2:2b',
      prompt: 'Respond with exactly: {"status": "success", "message": "Local Ollama connection working"}',
      stream: false,
      format: 'json'
    });
    const processingTime = Date.now() - startTime;
    
    console.log('   ✅ AI responded successfully');
    console.log('   ⏱️  Processing time:', processingTime, 'ms');
    
    // 4. Validate JSON response
    console.log('4. Validating JSON response...');
    try {
      const jsonResponse = JSON.parse(response.data.response.trim());
      console.log('   ✅ JSON is valid');
      console.log('   📄 Response:', JSON.stringify(jsonResponse, null, 2));
      
      if (jsonResponse.status === 'success') {
        console.log('   🎉 Connection test PASSED!');
      } else {
        console.log('   ⚠️  Unexpected response content');
      }
    } catch (parseError) {
      console.log('   ❌ Invalid JSON response');
      console.log('   📄 Raw response:', response.data.response);
    }
    
  } catch (error) {
    console.log('   ❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   💡 Make sure Ollama is running');
    }
  }
  
  console.log('\n🏁 Final Test Complete');
}

finalTest();