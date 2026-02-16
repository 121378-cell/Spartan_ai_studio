#!/usr/bin/env node
/**
 * Load Testing Framework for Spartan Hub
 * Automated performance and stress testing
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestScenario {
  name: string;
  description: string;
  configFile: string;
  expectedRPS?: number;
  maxResponseTime?: number;
}

interface TestResult {
  scenario: string;
  timestamp: string;
  duration: number;
  requestsCompleted: number;
  latency: {
    min: number;
    max: number;
    median: number;
    p95: number;
    p99: number;
  };
  rps: {
    mean: number;
    stddev: number;
  };
  httpCodes: Record<number, number>;
  errors: number;
  passed: boolean;
}

class LoadTester {
  private scenarios: TestScenario[] = [
    {
      name: "baseline",
      description: "Baseline performance test",
      configFile: "baseline-test.yml",
      expectedRPS: 50,
      maxResponseTime: 200
    },
    {
      name: "stress",
      description: "Stress test with increasing load",
      configFile: "stress-test.yml",
      expectedRPS: 100,
      maxResponseTime: 500
    },
    {
      name: "soak",
      description: "Long duration stability test",
      configFile: "soak-test.yml",
      expectedRPS: 25,
      maxResponseTime: 300
    }
  ];

  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log("🏋️ Starting Spartan Hub Load Testing Suite\n");

    for (const scenario of this.scenarios) {
      await this.runScenario(scenario);
    }

    await this.generateReport();
  }

  private async runScenario(scenario: TestScenario): Promise<void> {
    console.log(`\n🧪 Running ${scenario.name.toUpperCase()} test: ${scenario.description}`);
    console.log("=" .repeat(50));

    const startTime = Date.now();
    
    try {
      const result = await this.executeArtilleryTest(scenario);
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        scenario: scenario.name,
        timestamp: new Date().toISOString(),
        duration,
        passed: false,
        ...result
      };

      // Determine if test passed
      testResult.passed = this.evaluateTestResult(testResult, scenario);
      
      this.results.push(testResult);
      
      this.displayTestResult(testResult);
      
    } catch (error) {
      console.error(`❌ Test failed: ${(error as Error).message}`);
      this.results.push({
        scenario: scenario.name,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        requestsCompleted: 0,
        latency: { min: 0, max: 0, median: 0, p95: 0, p99: 0 },
        rps: { mean: 0, stddev: 0 },
        httpCodes: {},
        errors: 1,
        passed: false
      });
    }
  }

  private async executeArtilleryTest(scenario: TestScenario): Promise<Omit<TestResult, 'scenario' | 'timestamp' | 'duration' | 'passed'>> {
    return new Promise((resolve, reject) => {
      const configFile = path.join(__dirname, `../load-testing/${scenario.configFile}`);
      
      if (!fs.existsSync(configFile)) {
        reject(new Error(`Test config file not found: ${configFile}`));
        return;
      }

      const artillery = spawn('npx', ['artillery', 'run', '--output', 'temp-result.json', configFile], {
        cwd: path.join(__dirname, '..')
      });

      let output = '';
      let errorOutput = '';

      artillery.stdout.on('data', (data) => {
        output += data.toString();
      });

      artillery.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      artillery.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Artillery exited with code ${code}: ${errorOutput}`));
          return;
        }

        // Parse results
        try {
          const resultFile = path.join(__dirname, '../temp-result.json');
          const rawData = fs.readFileSync(resultFile, 'utf8');
          const results = JSON.parse(rawData);
          
          // Clean up temp file
          fs.unlinkSync(resultFile);

          resolve(this.processArtilleryResults(results));
        } catch (parseError) {
          reject(new Error(`Failed to parse test results: ${(parseError as Error).message}`));
        }
      });

      artillery.on('error', (error) => {
        reject(new Error(`Failed to start Artillery: ${(error as Error).message}`));
      });
    });
  }

  private processArtilleryResults(rawResults: any): Omit<TestResult, 'scenario' | 'timestamp' | 'duration' | 'passed'> {
    const summary = rawResults.aggregate;
    
    return {
      requestsCompleted: summary.requestsCompleted || 0,
      latency: {
        min: summary.latency.min || 0,
        max: summary.latency.max || 0,
        median: summary.latency.median || 0,
        p95: summary.latency.p95 || 0,
        p99: summary.latency.p99 || 0
      },
      rps: {
        mean: summary.rps.mean || 0,
        stddev: summary.rps.stddev || 0
      },
      httpCodes: summary.codes || {},
      errors: summary.errors || 0
    };
  }

  private evaluateTestResult(result: TestResult, scenario: TestScenario): boolean {
    const checks = [
      result.errors === 0,
      result.rps.mean >= (scenario.expectedRPS || 0) * 0.8, // 80% of expected RPS
      result.latency.p95 <= (scenario.maxResponseTime || 1000), // P95 under max response time
      result.latency.p99 <= (scenario.maxResponseTime || 1000) * 2 // P99 under 2x max
    ];

    return checks.every(check => check);
  }

  private displayTestResult(result: TestResult): void {
    console.log(`\n📊 Test Results for ${result.scenario.toUpperCase()}:`);
    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   Requests Completed: ${result.requestsCompleted}`);
    console.log(`   Throughput: ${result.rps.mean.toFixed(2)} RPS (±${result.rps.stddev.toFixed(2)})`);
    console.log(`   Latency - Min: ${result.latency.min}ms, Max: ${result.latency.max}ms`);
    console.log(`   Latency - Median: ${result.latency.median}ms, P95: ${result.latency.p95}ms, P99: ${result.latency.p99}ms`);
    console.log(`   Errors: ${result.errors}`);
    
    // HTTP status codes
    const statusCodes = Object.entries(result.httpCodes);
    if (statusCodes.length > 0) {
      console.log(`   HTTP Codes: ${statusCodes.map(([code, count]) => `${code}: ${count}`).join(', ')}`);
    }
    
    console.log(`   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  }

  private async generateReport(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("📈 LOAD TESTING SUMMARY REPORT");
    console.log("=".repeat(60));

    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    
    console.log(`\nOverall Results: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);

    // Performance summary
    const avgRPS = this.results.reduce((sum, r) => sum + r.rps.mean, 0) / this.results.length;
    const avgLatency = this.results.reduce((sum, r) => sum + r.latency.median, 0) / this.results.length;
    
    console.log(`\nPerformance Summary:`);
    console.log(`   Average Throughput: ${avgRPS.toFixed(2)} RPS`);
    console.log(`   Average Latency: ${avgLatency.toFixed(2)}ms`);

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (passedTests === totalTests) {
      console.log(`   ✅ All tests passed! System performs well under load.`);
      console.log(`   🔧 Consider increasing load levels for capacity planning.`);
    } else {
      console.log(`   ⚠️  Some tests failed. Investigate performance bottlenecks.`);
      console.log(`   🔍 Check database query performance and API response times.`);
      console.log(`   💾 Consider implementing caching for frequently accessed data.`);
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: totalTests,
        passedTests: passedTests,
        passRate: (passedTests/totalTests)*100
      },
      performance: {
        averageRPS: avgRPS,
        averageLatency: avgLatency
      },
      detailedResults: this.results
    };

    const reportPath = path.join(__dirname, '../reports/load-test-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📝 Detailed report saved to: ${reportPath}`);
  }
}

// Run load tests if executed directly
if (require.main === module) {
  const tester = new LoadTester();
  tester.runAllTests().catch(error => {
    console.error('Load testing failed:', error);
    process.exit(1);
  });
}

export default LoadTester;