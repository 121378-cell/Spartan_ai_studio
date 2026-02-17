import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
  channels: ('push' | 'email' | 'in_app')[];
  expiresAt: Date;
}

export interface BioStateEvaluation {
  userId: string;
  date: string;
  timestamp: Date;
  hrvStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  stressStatus: 'low' | 'moderate' | 'high' | 'critical';
  trainingLoadStatus: 'optimal' | 'heavy' | 'excessive';
  sleepQuality: 'excellent' | 'good' | 'poor' | 'critical';
  overallRecoveryStatus: number;
  nervousSystemLoad: number;
  injuryRisk: 'low' | 'moderate' | 'high' | 'critical';
  trainingReadiness: 'excellent' | 'good' | 'limited' | 'restricted';
  triggeredRules: string[];
  recommendedAction: string;
  actionPriority: 'low' | 'medium' | 'high' | 'urgent';
  confidenceScore: number;
  explanation: string;
}

export interface FormAnalysisFeedback {
  sessionId: number;
  formScore: number;
  efficiencyLevel: 'excellent' | 'good' | 'fair' | 'poor';
  issues: Array<{
    feedbackType: 'correction' | 'encouragement' | 'tip' | 'warning';
    bodyPart: string;
    issue: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
  vitalisAlert?: ProactiveAlert;
}

class CoachVitalisClient {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getProactiveAlerts(userId: string): Promise<ProactiveAlert[]> {
    try {
      const response = await axios.get(`${API_BASE}/coach-vitalis/alerts/${userId}`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch proactive alerts:', error);
      return [];
    }
  }

  async evaluateBioState(userId: string): Promise<BioStateEvaluation | null> {
    try {
      const response = await axios.post(`${API_BASE}/coach-vitalis/evaluate/${userId}`, {}, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to evaluate bio state:', error);
      return null;
    }
  }

  async generateCoachingAdvice(userId: string): Promise<{ advice: string; isAlert: boolean } | null> {
    try {
      const response = await axios.get(`${API_BASE}/coach-vitalis/advice/${userId}`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to generate coaching advice:', error);
      return null;
    }
  }

  async getFormAnalysisWithFeedback(sessionId: number): Promise<FormAnalysisFeedback | null> {
    try {
      const response = await axios.get(`${API_BASE}/form-analysis/session/${sessionId}/feedback`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to get form analysis feedback:', error);
      return null;
    }
  }

  async checkTechnicalEfficiency(userId: string): Promise<{
    isLowEfficiency: boolean;
    latestFormScore: number | null;
    alert: ProactiveAlert | null;
  }> {
    try {
      const response = await axios.get(`${API_BASE}/coach-vitalis/technical-efficiency/${userId}`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to check technical efficiency:', error);
      return { isLowEfficiency: false, latestFormScore: null, alert: null };
    }
  }
}

export const coachVitalisClient = new CoachVitalisClient();
export default coachVitalisClient;
