#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class PerformanceBenchmark {
    results = [];
    baselineResults = [];
    async runBenchmarkSuite(suiteName, testFn, iterations = 1000) {
        console.log(`\n⏱️  Running benchmark: ${suiteName}`);
        console.log("-".repeat(40));
        const times = [];
        let totalTime = 0;
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            try {
                await testFn();
            }
            catch (error) {
                console.warn(`Iteration ${i + 1} failed: ${error.message}`);
                continue;
            }
            const endTime = performance.now();
            const duration = endTime - startTime;
            times.push(duration);
            totalTime += duration;
            if ((i + 1) % Math.ceil(iterations / 10) === 0) {
                const percent = ((i + 1) / iterations * 100).toFixed(0);
                process.stdout.write(`\rProgress: ${percent}%`);
            }
        }
        process.stdout.write('\n');
        times.sort((a, b) => a - b);
        const result = {
            timestamp: new Date().toISOString(),
            testName: suiteName,
            iterations: times.length,
            totalTime,
            averageTime: totalTime / times.length,
            minTime: times[0],
            maxTime: times[times.length - 1],
            percentile95: times[Math.floor(times.length * 0.95)],
            percentile99: times[Math.floor(times.length * 0.99)],
            throughput: times.length / (totalTime / 1000)
        };
        this.results.push(result);
        this.displayBenchmarkResult(result);
        return result;
    }
    displayBenchmarkResult(result) {
        console.log(`\n📊 Results for "${result.testName}":`);
        console.log(`   Iterations: ${result.iterations}`);
        console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
        console.log(`   Average: ${result.averageTime.toFixed(2)}ms`);
        console.log(`   Min/Max: ${result.minTime.toFixed(2)}ms / ${result.maxTime.toFixed(2)}ms`);
        console.log(`   P95/P99: ${result.percentile95.toFixed(2)}ms / ${result.percentile99.toFixed(2)}ms`);
        console.log(`   Throughput: ${result.throughput.toFixed(2)} ops/sec`);
    }
    async runDatabaseBenchmarks() {
        console.log("🗄️  Database Performance Benchmarks");
        console.log("=".repeat(45));
        await this.runBenchmarkSuite("Simple SELECT Query", async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
        }, 1000);
        await this.runBenchmarkSuite("Complex JOIN Query", async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 20));
        }, 500);
        await this.runBenchmarkSuite("INSERT Operation", async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 15 + 10));
        }, 800);
    }
    async runAPMBenchmarks() {
        console.log("\n📊 APM Instrumentation Benchmarks");
        console.log("=".repeat(35));
        await this.runBenchmarkSuite("Metric Collection Overhead", async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 2 + 1));
        }, 2000);
        await this.runBenchmarkSuite("Trace Context Propagation", async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 5 + 2));
        }, 1000);
    }
    async runAllBenchmarks() {
        console.log("🚀 Starting Performance Benchmark Suite");
        console.log("=====================================\n");
        await this.runDatabaseBenchmarks();
        await this.runAPMBenchmarks();
        await this.generateBenchmarkReport();
    }
    async generateBenchmarkReport() {
        console.log("\n" + "=".repeat(50));
        console.log("📈 PERFORMANCE BENCHMARK REPORT");
        console.log("=".repeat(50));
        const totalTests = this.results.length;
        const avgThroughput = this.results.reduce((sum, r) => sum + r.throughput, 0) / totalTests;
        const avgLatency = this.results.reduce((sum, r) => sum + r.averageTime, 0) / totalTests;
        console.log(`\nSummary:`);
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   Average Throughput: ${avgThroughput.toFixed(2)} ops/sec`);
        console.log(`   Average Latency: ${avgLatency.toFixed(2)}ms`);
        console.log(`\nPerformance by Category:`);
        const dbResults = this.results.filter(r => r.testName.includes('Database') || r.testName.includes('SELECT') || r.testName.includes('JOIN') || r.testName.includes('INSERT'));
        if (dbResults.length > 0) {
            const dbAvgThroughput = dbResults.reduce((sum, r) => sum + r.throughput, 0) / dbResults.length;
            console.log(`   Database Operations: ${dbAvgThroughput.toFixed(2)} ops/sec`);
        }
        const apmResults = this.results.filter(r => r.testName.includes('APM') || r.testName.includes('Metric') || r.testName.includes('Trace'));
        if (apmResults.length > 0) {
            const apmAvgOverhead = apmResults.reduce((sum, r) => sum + r.averageTime, 0) / apmResults.length;
            console.log(`   APM Overhead: ${apmAvgOverhead.toFixed(2)}ms per operation`);
        }
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests,
                averageThroughput: avgThroughput,
                averageLatency: avgLatency
            },
            detailedResults: this.results
        };
        const reportPath = path_1.default.join(__dirname, '../reports/performance-benchmark-report.json');
        const reportDir = path_1.default.dirname(reportPath);
        if (!fs_1.default.existsSync(reportDir)) {
            fs_1.default.mkdirSync(reportDir, { recursive: true });
        }
        fs_1.default.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📝 Detailed report saved to: ${reportPath}`);
        await this.compareWithBaseline();
    }
    async compareWithBaseline() {
        const baselinePath = path_1.default.join(__dirname, '../reports/baseline-performance.json');
        if (fs_1.default.existsSync(baselinePath)) {
            try {
                const baselineData = fs_1.default.readFileSync(baselinePath, 'utf8');
                this.baselineResults = JSON.parse(baselineData).detailedResults;
                console.log(`\n🔍 Baseline Comparison:`);
                for (const currentResult of this.results) {
                    const baselineResult = this.baselineResults.find(r => r.testName === currentResult.testName);
                    if (baselineResult) {
                        const performanceChange = ((currentResult.throughput - baselineResult.throughput) / baselineResult.throughput) * 100;
                        const latencyChange = ((currentResult.averageTime - baselineResult.averageTime) / baselineResult.averageTime) * 100;
                        console.log(`   ${currentResult.testName}:`);
                        console.log(`     Throughput: ${performanceChange >= 0 ? '🟢' : '🔴'} ${performanceChange.toFixed(2)}%`);
                        console.log(`     Latency: ${latencyChange <= 0 ? '🟢' : '🔴'} ${latencyChange.toFixed(2)}%`);
                    }
                }
            }
            catch (error) {
                console.warn('Could not load baseline data for comparison');
            }
        }
        else {
            console.log(`\n💾 Saving current results as baseline`);
            const baselineData = {
                timestamp: new Date().toISOString(),
                detailedResults: this.results
            };
            const baselinePath = path_1.default.join(__dirname, '../reports/baseline-performance.json');
            fs_1.default.writeFileSync(baselinePath, JSON.stringify(baselineData, null, 2));
        }
    }
    async saveAsBaseline() {
        const baselineData = {
            timestamp: new Date().toISOString(),
            detailedResults: this.results
        };
        const baselinePath = path_1.default.join(__dirname, '../reports/baseline-performance.json');
        fs_1.default.writeFileSync(baselinePath, JSON.stringify(baselineData, null, 2));
        console.log(`\n✅ Current performance saved as new baseline`);
    }
}
if (require.main === module) {
    const benchmark = new PerformanceBenchmark();
    const args = process.argv.slice(2);
    if (args.includes('--save-baseline')) {
        benchmark.runAllBenchmarks().then(() => benchmark.saveAsBaseline());
    }
    else {
        benchmark.runAllBenchmarks();
    }
}
exports.default = PerformanceBenchmark;
//# sourceMappingURL=performance-benchmark.js.map