import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import axios from 'axios';
import { GroqProvider } from '../../../services/ai/providers/GroqProvider';
import { UserProfile } from '../../../models/User';
import { DecisionContext } from '../../../services/decisionPromptTemplate';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GroqProvider', () => {
  let provider: GroqProvider;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, GROQ_API_KEY: 'test-key' };
    provider = new GroqProvider();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('predictAlert', () => {
    const mockProfile: UserProfile = {
      name: 'Test',
      email: 'test@test.com',
      quest: 'test quest',
      stats: {
        totalWorkouts: 4,
        currentStreak: 7,
        joinDate: '2026-01-01'
      },
      onboardingCompleted: true,
      keystoneHabits: [],
      masterRegulationSettings: { targetBedtime: '22:00' },
      nutritionSettings: { priority: 'performance' },
      isInAutonomyPhase: false,
      role: 'user'
    };

    it('should call Groq API and return alert prediction', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  alerta_roja: true,
                  explanation: 'Test explanation'
                })
              }
            }
          ]
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: 'https://api.groq.com/openai/v1/chat/completions',
          method: 'POST',
          headers: {}
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await provider.predictAlert(mockProfile);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          model: 'llama3-8b-8192',
          messages: expect.any(Array),
          response_format: { type: 'json_object' }
        }),
        expect.any(Object)
      );

      expect(result.alerta_roja).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.fallback_used).toBe(false);
    });

    it('should handle API errors and return fallback', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));

      const result = await provider.predictAlert(mockProfile);

      expect(result.fallback_used).toBe(true);
      expect(result.alerta_roja).toBe(false);
      expect(result.error).toContain('API Error');
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Invalid JSON'
              }
            }
          ]
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: 'https://api.groq.com/openai/v1/chat/completions',
          method: 'POST',
          headers: {}
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await provider.predictAlert(mockProfile);

      expect(result.fallback_used).toBe(true);
      expect(result.error).toBeDefined();
    });
  });

  describe('generateDecision', () => {
    const mockContext: DecisionContext = {
      PartituraSemanal: { score: 10 },
      Causa: 'Test cause',
      PuntajeSinergico: 50
    };

    it('should call Groq API and return decision', async () => {
      const mockDecision = {
        NewPartituraSemanal: { score: 15 },
        JustificacionTactical: 'Tactical fix',
        IsAlertaRoja: false
      };

      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockDecision)
              }
            }
          ]
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: 'https://api.groq.com/openai/v1/chat/completions',
          method: 'POST',
          headers: {}
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await provider.generateDecision(mockContext);

      expect(mockedAxios.post).toHaveBeenCalled();
      expect(result).toEqual(mockDecision);
    });

    it('should return null on error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));

      const result = await provider.generateDecision(mockContext);

      expect(result).toBeNull();
    });
  });

  describe('checkHealth', () => {
    it('should return true when API call succeeds', async () => {
      mockedAxios.get.mockResolvedValueOnce({ 
        status: 200, 
        data: {}, 
        statusText: 'OK', 
        headers: {}, 
        config: {
          url: 'https://api.groq.com/openai/v1/models',
          method: 'GET',
          headers: {}
        }
      });

      const result = await provider.checkHealth();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/models',
        expect.any(Object)
      );
    });

    it('should return false when API call fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      const result = await provider.checkHealth();

      expect(result).toBe(false);
    });
  });
});
