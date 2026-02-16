/**
 * Anomaly Detector Service - Dummy Implementation for Build Compatibility
 */

import { logger } from '../utils/logger';

export interface AnomalyResult {
  isAnomalous: boolean;
  score: number;
  signals: string[];
}

export const anomalyDetector = {
  /**
   * Detect anomalies in biometric data
   */
  detectAnomalies: (userId: string, data: any): AnomalyResult => {
    logger.info('Dummy anomaly detection called', { userId });
    return {
      isAnomalous: false,
      score: 0,
      signals: []
    };
  }
};

export default anomalyDetector;
