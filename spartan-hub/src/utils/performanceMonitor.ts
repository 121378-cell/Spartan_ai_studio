/**
 * Performance Monitoring Script
 * Phase A: Video Form Analysis MVP
 * 
 * Monitors and reports performance metrics:
 * - FPS during recording
 * - Memory usage
 * - Load times
 * - Network latency
 */

export interface PerformanceMetrics {
  fps: {
    current: number;
    average: number;
    min: number;
    max: number;
  };
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  timing: {
    firstContentfulPaint: number;
    timeToInteractive: number;
    domContentLoaded: number;
    loadComplete: number;
  };
  network: {
    apiLatency: number;
    websocketLatency: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: { current: 0, average: 0, min: 60, max: 0 },
    memory: { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 },
    timing: {
      firstContentfulPaint: 0,
      timeToInteractive: 0,
      domContentLoaded: 0,
      loadComplete: 0
    },
    network: { apiLatency: 0, websocketLatency: 0 }
  };

  private fpsHistory: number[] = [];
  private frameCount = 0;
  private lastTime = performance.now();

  /**
   * Start monitoring FPS
   */
  startFPSMonitoring(): void {
    const measureFPS = (currentTime: number) => {
      this.frameCount++;
      
      const delta = currentTime - this.lastTime;
      
      if (delta >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / delta);
        this.fpsHistory.push(fps);
        
        // Update metrics
        this.metrics.fps.current = fps;
        this.metrics.fps.average = this.calculateAverage(this.fpsHistory);
        this.metrics.fps.min = Math.min(...this.fpsHistory);
        this.metrics.fps.max = Math.max(...this.fpsHistory);
        
        // Keep last 60 seconds
        if (this.fpsHistory.length > 60) {
          this.fpsHistory.shift();
        }
        
        this.frameCount = 0;
        this.lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  /**
   * Monitor memory usage
   */
  monitorMemory(): void {
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      this.metrics.memory = {
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit
      };
    }
  }

  /**
   * Record timing metrics
   */
  recordTiming(): void {
    const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (timing) {
      this.metrics.timing = {
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        timeToInteractive: timing.domInteractive - timing.startTime,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.startTime,
        loadComplete: timing.loadEventEnd - timing.startTime
      };
    }
  }

  /**
   * Measure API latency
   */
  async measureAPILatency(url: string): Promise<number> {
    const start = performance.now();
    
    try {
      await fetch(url, { method: 'HEAD' });
      const latency = performance.now() - start;
      this.metrics.network.apiLatency = latency;
      return latency;
    } catch (error) {
      console.error('Failed to measure API latency:', error);
      return -1;
    }
  }

  /**
   * Measure WebSocket latency
   */
  measureWebSocketLatency(ws: WebSocket): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      
      ws.send(JSON.stringify({ type: 'ping', timestamp: start }));
      
      const messageHandler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            const latency = performance.now() - start;
            this.metrics.network.websocketLatency = latency;
            resolve(latency);
            ws.removeEventListener('message', messageHandler);
          }
        } catch {
          // Ignore parse errors
        }
      };
      
      ws.addEventListener('message', messageHandler);
      
      // Timeout after 5 seconds
      setTimeout(() => resolve(-1), 5000);
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const report = [
      '📊 Performance Report\n',
      'FPS:',
      `  Current: ${this.metrics.fps.current}`,
      `  Average: ${this.metrics.fps.average}`,
      `  Min: ${this.metrics.fps.min}`,
      `  Max: ${this.metrics.fps.max}\n`,
      'Memory:',
      `  Used: ${(this.metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      `  Total: ${(this.metrics.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB\n`,
      'Timing:',
      `  FCP: ${this.metrics.timing.firstContentfulPaint.toFixed(2)} ms`,
      `  TTI: ${this.metrics.timing.timeToInteractive.toFixed(2)} ms`,
      `  DOMContentLoaded: ${this.metrics.timing.domContentLoaded.toFixed(2)} ms`,
      `  Load: ${this.metrics.timing.loadComplete.toFixed(2)} ms\n`,
      'Network:',
      `  API Latency: ${this.metrics.network.apiLatency.toFixed(2)} ms`,
      `  WebSocket Latency: ${this.metrics.network.websocketLatency.toFixed(2)} ms`
    ].join('\n');

    return report;
  }

  /**
   * Check performance thresholds
   */
  checkThresholds(): { passed: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // FPS threshold (should be >= 55)
    if (this.metrics.fps.average < 55) {
      warnings.push(`Low FPS: ${this.metrics.fps.average} (target: >= 55)`);
    }

    // FCP threshold (should be < 1.5s)
    if (this.metrics.timing.firstContentfulPaint > 1500) {
      warnings.push(`Slow FCP: ${this.metrics.timing.firstContentfulPaint.toFixed(0)}ms (target: < 1500ms)`);
    }

    // TTI threshold (should be < 3s)
    if (this.metrics.timing.timeToInteractive > 3000) {
      warnings.push(`Slow TTI: ${this.metrics.timing.timeToInteractive.toFixed(0)}ms (target: < 3000ms)`);
    }

    // Memory threshold (should be < 100MB)
    if (this.metrics.memory.usedJSHeapSize > 100 * 1024 * 1024) {
      warnings.push(`High memory usage: ${(this.metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB (target: < 100MB)`);
    }

    return {
      passed: warnings.length === 0,
      warnings
    };
  }

  private calculateAverage(arr: number[]): number {
    return arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }
}

// Singleton instance
const instance = new PerformanceMonitor();

export const performanceMonitor = instance;
export default performanceMonitor;
