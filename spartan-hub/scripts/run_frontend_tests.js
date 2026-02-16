const { exec } = require('child_process');

// Run only our new frontend tests
exec('npx jest __tests__/componentImport.test.js __tests__/aiService.test.js __tests__/AiChat.test.js __tests__/indexHtml.test.js __tests__/publicAssets.test.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error}`);
    return;
  }
  
  console.log(stdout);
  if (stderr) {
    console.error(stderr);
  }
});