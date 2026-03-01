/**
 * Form Analysis API Service Tests
 * Phase A: Video Form Analysis MVP
 */

import { formAnalysisApi, FormAnalysis, CreateFormAnalysisDTO } from '../formAnalysisApi';

// Mock axios
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    }))
  };
  return mockAxios;
});

describe('FormAnalysisApiService', () => {
  const mockApi = (formAnalysisApi as any).api;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveAnalysis', () => {
    it('should save form analysis successfully', async () => {
      const mockData: CreateFormAnalysisDTO = {
        userId: 'user-123',
        exerciseType: 'squat',
        formScore: 85,
        metrics: { repsCompleted: 10 },
        warnings: [],
        recommendations: []
      };

      const mockResponse: FormAnalysis = {
        id: 'analysis-1',
        ...mockData,
        createdAt: Date.now()
      };

      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: mockResponse }
      });

      const result = await formAnalysisApi.saveAnalysis(mockData);

      expect(result).toEqual(mockResponse);
      expect(mockApi.post).toHaveBeenCalledWith('/form-analysis', mockData);
    });

    it('should handle API errors', async () => {
      const mockData: CreateFormAnalysisDTO = {
        userId: 'user-123',
        exerciseType: 'squat',
        formScore: 85,
        metrics: {},
        warnings: [],
        recommendations: []
      };

      mockApi.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(formAnalysisApi.saveAnalysis(mockData)).rejects.toThrow('Network error');
    });
  });

  describe('getAnalysisById', () => {
    it('should get form analysis by ID', async () => {
      const mockResponse: FormAnalysis = {
        id: 'analysis-1',
        userId: 'user-123',
        exerciseType: 'squat',
        formScore: 85,
        metrics: {},
        warnings: [],
        recommendations: [],
        createdAt: Date.now()
      };

      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockResponse }
      });

      const result = await formAnalysisApi.getAnalysisById('analysis-1');

      expect(result).toEqual(mockResponse);
      expect(mockApi.get).toHaveBeenCalledWith('/form-analysis/analysis-1');
    });
  });

  describe('getUserAnalyses', () => {
    it('should get user analyses with default limit', async () => {
      const mockAnalyses: FormAnalysis[] = [
        {
          id: 'analysis-1',
          userId: 'user-123',
          exerciseType: 'squat',
          formScore: 85,
          metrics: {},
          warnings: [],
          recommendations: [],
          createdAt: Date.now()
        }
      ];

      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockAnalyses, count: 1 }
      });

      const result = await formAnalysisApi.getUserAnalyses('user-123');

      expect(result).toEqual(mockAnalyses);
      expect(mockApi.get).toHaveBeenCalledWith('/form-analysis/user/user-123', {
        params: { limit: 50 }
      });
    });

    it('should respect custom limit', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: [], count: 0 }
      });

      await formAnalysisApi.getUserAnalyses('user-123', 10);

      expect(mockApi.get).toHaveBeenCalledWith('/form-analysis/user/user-123', {
        params: { limit: 10 }
      });
    });
  });

  describe('getUserStats', () => {
    it('should get user statistics', async () => {
      const mockStats = {
        totalAnalyses: 10,
        averageScore: 82.5,
        bestScore: 95,
        worstScore: 65,
        byExerciseType: {
          squat: { count: 5, averageScore: 85 },
          deadlift: { count: 5, averageScore: 80 }
        }
      };

      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockStats }
      });

      const result = await formAnalysisApi.getUserStats('user-123');

      expect(result).toEqual(mockStats);
      expect(mockApi.get).toHaveBeenCalledWith('/form-analysis/user/user-123/stats');
    });
  });

  describe('deleteAnalysis', () => {
    it('should delete form analysis', async () => {
      mockApi.delete.mockResolvedValueOnce({});

      await formAnalysisApi.deleteAnalysis('analysis-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/form-analysis/analysis-1');
    });
  });
});
