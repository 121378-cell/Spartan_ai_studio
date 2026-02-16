/**
 * Holt-Winters (Triple Exponential Smoothing) Algorithm
 * 
 * Provides additive Holt-Winters forecasting for time-series data.
 */

export interface HoltWintersOptions {
  alpha: number; // Level smoothing
  beta: number;  // Trend smoothing
  gamma: number; // Seasonal smoothing
  period: number; // Seasonal period (e.g., 7 for weekly)
}

export class HoltWinters {
  /**
   * Calculate additive Holt-Winters forecast
   * 
   * @param data - Input time series data
   * @param forecastPeriods - Number of periods to forecast
   * @param options - Smoothing parameters
   * @returns Array containing historical fit + forecast
   */
  public static forecast(
    data: number[],
    forecastPeriods: number,
    options: HoltWintersOptions
  ): number[] {
    const { alpha, beta, gamma, period } = options;
    const n = data.length;

    if (n < period * 2) {
      throw new Error(`Insufficient data for seasonal period ${period}. Need at least ${period * 2} points.`);
    }

    // Initial level: average of first period
    let level = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // Initial trend: average of differences between first two periods
    let trend = 0;
    for (let i = 0; i < period; i++) {
      trend += (data[i + period] - data[i]) / period;
    }
    trend /= period;

    // Initial seasonal components
    const seasonal: number[] = new Array(period);
    for (let i = 0; i < period; i++) {
      seasonal[i] = data[i] - level;
    }

    const result: number[] = new Array(n + forecastPeriods);
    const levels: number[] = new Array(n);
    const trends: number[] = new Array(n);
    const seasonals: number[] = new Array(n + forecastPeriods);

    // Seed initial values
    levels[0] = level;
    trends[0] = trend;
    for (let i = 0; i < period; i++) {
      seasonals[i] = seasonal[i];
    }

    // Fit historical data
    for (let i = 0; i < n; i++) {
      const val = data[i];
      const lastLevel = level;
      
      // Update Level
      level = alpha * (val - seasonals[i]) + (1 - alpha) * (level + trend);
      
      // Update Trend
      trend = beta * (level - lastLevel) + (1 - beta) * trend;
      
      // Update Seasonal
      seasonals[i + period] = gamma * (val - level) + (1 - gamma) * seasonals[i];
      
      levels[i] = level;
      trends[i] = trend;
      result[i] = lastLevel + trend + seasonals[i];
    }

    // Generate Forecast
    for (let i = 1; i <= forecastPeriods; i++) {
      const m = i;
      result[n + i - 1] = level + m * trend + seasonals[n + i - 1];
    }

    return result;
  }
}
