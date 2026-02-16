#!/usr/bin/env node

// Script to check coverage thresholds from coverage-summary.json
const fs = require('fs');
const path = require('path');

// Coverage thresholds
const THRESHOLDS = {
  statements: 85,
  branches: 85,
  functions: 85,
  lines: 85
};

function checkCoverage() {
  try {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    
    if (!fs.existsSync(coveragePath)) {
      console.log('❌ Coverage summary not found');
      process.exit(1);
    }
    
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const totals = coverageData.total;
    
    console.log('\n📊 Coverage Report:');
    console.log('====================');
    
    let failed = false;
    
    Object.keys(THRESHOLDS).forEach(metric => {
      const actual = totals[metric].pct;
      const required = THRESHOLDS[metric];
      
      if (actual >= required) {
        console.log(`✅ ${metric}: ${actual}% (required: ${required}%)`);
      } else {
        console.log(`❌ ${metric}: ${actual}% (required: ${required}%) - FAILED`);
        failed = true;
      }
    });
    
    console.log('\n🎯 Overall Status:');
    if (failed) {
      console.log('❌ Coverage requirements not met');
      process.exit(1);
    } else {
      console.log('✅ All coverage requirements satisfied');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('Error checking coverage:', error.message);
    process.exit(1);
  }
}

// Run the check
checkCoverage();