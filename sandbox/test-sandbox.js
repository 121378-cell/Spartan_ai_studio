const axios = require('axios');

async function checkHealth() {
  console.log('🔍 Verificando salud del Sandbox...');
  
  const services = [
    { name: 'Backend API', url: 'http://localhost:3001/health' },
    { name: 'AI Service', url: 'http://localhost:9000/health' },
    { name: 'Ollama', url: 'http://localhost:11434/api/tags' }
  ];

  for (const service of services) {
    try {
      const response = await axios.get(service.url);
      if (response.status === 200) {
        console.log(`✅ ${service.name}: OK`);
      } else {
        console.log(`⚠️ ${service.name}: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${service.name}: No responde (${error.message})`);
    }
  }
}

checkHealth();
