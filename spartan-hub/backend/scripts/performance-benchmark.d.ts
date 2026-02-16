#!/usr/bin/env node
interface BenchmarkResult {
    timestamp: string;
    testName: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    percentile95: number;
    percentile99: number;
    throughput: number;
}
declare class PerformanceBenchmark {
    private results;
    private baselineResults;
    runBenchmarkSuite(suiteName: string, testFn: () => Promise<any>, iterations?: number): Promise<BenchmarkResult>;
    private displayBenchmarkResult;
    runDatabaseBenchmarks(): Promise<void>;
    runAPMBenchmarks(): Promise<void>;
    runAllBenchmarks(): Promise<void>;
    private generateBenchmarkReport;
    private compareWithBaseline;
    saveAsBaseline(): Promise<void>;
}
export default PerformanceBenchmark;
//# sourceMappingURL=performance-benchmark.d.ts.map