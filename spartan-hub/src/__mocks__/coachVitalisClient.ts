export interface ProactiveAlert {
  id: string;
  userId: string;
  timestamp: Date;
  type: 'warning' | 'optimization' | 'intervention' | 'celebration';
  severity: 'info' | 'warning' | 'urgent' | 'critical';
  title: string;
  message: string;
  context: {
    triggerReason: string;
    affectedMetrics: string[];
    confidenceScore: number;
  };
  recommendedAction: {
    action: string;
    expectedBenefit: string;
    duration?: string;
  };
  channels: Array<'push' | 'email' | 'in_app'>;
  expiresAt: Date;
}

export const coachVitalisClient = {
  getProactiveAlerts: async (): Promise<ProactiveAlert[]> => [],
  evaluateBioState: async (): Promise<null> => null,
  generateCoachingAdvice: async (): Promise<null> => null,
  getFormAnalysisWithFeedback: async (): Promise<null> => null,
  checkTechnicalEfficiency: async (): Promise<{
    isLowEfficiency: boolean;
    latestFormScore: number | null;
    alert: ProactiveAlert | null;
  }> => ({
    isLowEfficiency: false,
    latestFormScore: null,
    alert: null
  })
};
