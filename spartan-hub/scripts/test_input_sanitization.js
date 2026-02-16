#!/usr/bin/env node

/**
 * Comprehensive Input Sanitization Test
 * Tests the input sanitization functionality across frontend and backend components
 */

const { 
  sanitizeInput, 
  sanitizeHtml, 
  sanitizePlainText, 
  sanitizeRichText, 
  sanitizeUserInput,
  validateAndSanitizeString,
  sanitizeNumericInput,
  sanitizeUrlInput,
  sanitizeEmailInput
} = require('./utils/inputSanitizer');

console.log('🧪 Testing Input Sanitization Implementation\n');

// Test results tracking
let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`✅ ${testName}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${testName}: ${error.message}`);
  }
}

// Frontend Sanitization Tests
console.log('🔍 Frontend Input Sanitization Tests:');
console.log('=====================================');

// Test 1: Basic XSS prevention
runTest('sanitizeInput prevents XSS attacks', () => {
  const maliciousInput = '<script>alert("XSS")</script>';
  const sanitized = sanitizeInput(maliciousInput);
  if (sanitized.includes('<script>') || sanitized.includes('alert')) {
    throw new Error('XSS attack not prevented');
  }
  console.log(`   Input: ${maliciousInput}`);
  console.log(`   Output: ${sanitized}`);
});

// Test 2: Plain text sanitization removes all HTML
runTest('sanitizePlainText removes all HTML tags', () => {
  const htmlInput = '<p>Hello <strong>World</strong></p>';
  const sanitized = sanitizePlainText(htmlInput);
  if (sanitized.includes('<') || sanitized.includes('>')) {
    throw new Error('HTML tags not removed');
  }
  console.log(`   Input: ${htmlInput}`);
  console.log(`   Output: ${sanitized}`);
});

// Test 3: Rich text sanitization allows safe HTML
runTest('sanitizeRichText allows safe HTML tags', () => {
  const richInput = '<p>Hello <strong>World</strong></p>';
  const sanitized = sanitizeRichText(richInput);
  if (!sanitized.includes('<strong>') || sanitized.includes('<script>')) {
    throw new Error('Safe HTML not preserved or malicious HTML not removed');
  }
  console.log(`   Input: ${richInput}`);
  console.log(`   Output: ${sanitized}`);
});

// Test 4: Field-specific sanitization
runTest('sanitizeUserInput applies field-specific rules', () => {
  const nameInput = '<script>alert("xss")</script>John';
  const descriptionInput = '<p>Safe <strong>content</strong> <script>alert("xss")</script></p>';
  
  const sanitizedName = sanitizeUserInput(nameInput, 'name');
  const sanitizedDesc = sanitizeUserInput(descriptionInput, 'description');
  
  if (sanitizedName.includes('<script>') || sanitizedDesc.includes('<script>')) {
    throw new Error('Field-specific sanitization failed');
  }
  
  console.log(`   Name input: ${nameInput} -> ${sanitizedName}`);
  console.log(`   Description input: ${descriptionInput} -> ${sanitizedDesc}`);
});

// Test 5: Email sanitization
runTest('sanitizeEmailInput validates and sanitizes emails', () => {
  const emailInput = '<script>@example.com';
  const result = sanitizeEmailInput(emailInput);
  
  if (!result.isValid || result.value.includes('<script>')) {
    throw new Error('Email sanitization failed');
  }
  console.log(`   Input: ${emailInput}`);
  console.log(`   Valid: ${result.isValid}, Sanitized: ${result.value}`);
});

// Test 6: URL sanitization
runTest('sanitizeUrlInput validates and sanitizes URLs', () => {
  const validUrl = 'https://example.com';
  const maliciousUrl = 'javascript:alert("xss")';
  
  const validResult = sanitizeUrlInput(validUrl);
  const maliciousResult = sanitizeUrlInput(maliciousUrl);
  
  if (!validResult.isValid || maliciousResult.isValid) {
    throw new Error('URL validation failed');
  }
  console.log(`   Valid URL: ${validUrl} -> ${validResult.isValid}`);
  console.log(`   Malicious URL: ${maliciousUrl} -> ${maliciousResult.isValid}`);
});

// Test 7: Numeric input sanitization
runTest('sanitizeNumericInput validates numeric inputs', () => {
  const validNum = '123.45';
  const invalidNum = 'not-a-number';
  
  const validResult = sanitizeNumericInput(validNum);
  const invalidResult = sanitizeNumericInput(invalidNum);
  
  if (!validResult.isValid || invalidResult.isValid) {
    throw new Error('Numeric validation failed');
  }
  console.log(`   Valid number: ${validNum} -> ${validResult.value}`);
  console.log(`   Invalid number: ${invalidNum} -> ${invalidResult.isValid}`);
});

// Backend Sanitization Utility Tests
console.log('\n🔧 Backend Sanitization Utility Tests:');
console.log('=====================================');

const backendSanitization = require('./backend/src/utils/sanitization');

runTest('Backend sanitizePlainText removes all HTML', () => {
  const htmlInput = '<p>Hello <strong>World</strong></p>';
  const sanitized = backendSanitization.sanitizePlainText(htmlInput);
  
  if (sanitized.includes('<') || sanitized.includes('>')) {
    throw new Error('Backend plain text sanitization failed');
  }
  console.log(`   Backend input: ${htmlInput}`);
  console.log(`   Backend output: ${sanitized}`);
});

runTest('Backend sanitizeLimitedHtml allows safe tags', () => {
  const richInput = '<p>Hello <strong>World</strong></p>';
  const sanitized = backendSanitization.sanitizeLimitedHtml(richInput);
  
  if (!sanitized.includes('<strong>') || sanitized.includes('<script>')) {
    throw new Error('Backend limited HTML sanitization failed');
  }
  console.log(`   Backend input: ${richInput}`);
  console.log(`   Backend output: ${sanitized}`);
});

runTest('Backend sanitizeRichText allows extended HTML', () => {
  const richInput = '<h1>Title</h1><p>Content</p><blockquote>Quote</blockquote>';
  const sanitized = backendSanitization.sanitizeRichText(richInput);
  
  if (!sanitized.includes('<h1>') || !sanitized.includes('<blockquote>')) {
    throw new Error('Backend rich text sanitization failed');
  }
  console.log(`   Backend input: ${richInput}`);
  console.log(`   Backend output: ${sanitized}`);
});

// Security Test - Real-world Attack Vectors
console.log('\n🛡️  Security Tests - Attack Vector Protection:');
console.log('=============================================');

const attackVectors = [
  { name: 'XSS Script', input: '<script>alert(document.cookie)</script>' },
  { name: 'Event Handler', input: '<img src="x" onerror="alert(1)">' },
  { name: 'JavaScript Protocol', input: 'javascript:alert("xss")' },
  { name: 'Data URI', input: 'data:text/html,<script>alert("xss")</script>' },
  { name: 'SQL Injection', input: "'; DROP TABLE users; --" },
  { name: 'Command Injection', input: '; rm -rf /' },
  { name: 'HTML Injection', input: '<div onclick="alert(1)">Click me</div>' }
];

attackVectors.forEach(attack => {
  runTest(`${attack.name} prevention`, () => {
    const sanitized = sanitizeInput(attack.input);
    
    // Check for common attack patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i,
      /expression\(/i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error(`Attack vector not neutralized: ${attack.name}`);
      }
    }
    
    console.log(`   Attack: ${attack.input}`);
    console.log(`   Sanitized: ${sanitized}`);
  });
});

// Summary
console.log('\n📊 Test Results Summary:');
console.log('========================');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 All input sanitization tests passed! The implementation is working correctly.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}