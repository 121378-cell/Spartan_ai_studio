/**
 * useFormAnalysisApi Hook Tests
 * Phase A: Video Form Analysis MVP
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useFormAnalysisApi } from '../useFormAnalysisApi';
import { formAnalysisApi } from '../../services/formAnalysisApi';

// Mock formAnalysisApi
jest.mock('../../services/formAnalysisApi', () => ({
  formAnalysisApi: {
    saveAnalysis: jest.fn(),
    getUserAnalyses: jest.fn(),
    getUserStats: jest.fn(),
    deleteAnalysis: jest.fn()
  }
}));

describe('useFormAnalysisApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with default values', () => {
      const { result } = renderHook(() => useFormAnalysisApi());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastSaved).toBeNull();
      expect(result.current.stats).toBeNull();
    });
  });

  describe('saveAnalysis', () => {
    it('should save analysis successfully', async () => {
      const mockData = {
        userId: 'user-123',
        exerciseType: 'squat',
        formScore: 85,
        metrics: {},
        warnings: [],
        recommendations: []
      };

      const mockResult = {
        id: 'analysis-1',
        ...mockData,
        createdAt: Date.now()
      };

      (formAnalysisApi.saveAnalysis as jest.Mock).mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useFormAnalysisApi());

      let savedResult;
      await act(async () => {
        savedResult = await result.current.saveAnalysis(mockData);
      });

      expect(result.current.isSaving).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastSaved).toEqual(mockResult);
      expect(savedResult).toEqual(mockResult);
      expect(formAnalysisApi.saveAnalysis).toHaveBeenCalledWith(mockData);
    });

    it('should handle save errors', async () => {
      const mockData = {
        userId: 'user-123',
        exerciseType: 'squat',
        formScore: 85,
        metrics: {},
        warnings: [],
        recommendations: []
      };

      (formAnalysisApi.saveAnalysis as jest.Mock).mockRejectedValueOnce(
        new Error('Save failed')
      );

      const { result } = renderHook(() => useFormAnalysisApi());

      await act(async () => {
        await expect(result.current.saveAnalysis(mockData)).rejects.toThrow('Save failed');
      });

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false);
        expect(result.current.error).toBe('Save failed');
      });
    });
  });

  describe('getUserAnalyses', () => {
    it('should get user analyses', async () => {
      const mockAnalyses = [
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

      (formAnalysisApi.getUserAnalyses as jest.Mock).mockResolvedValueOnce(mockAnalyses);

      const { result } = renderHook(() => useFormAnalysisApi());

      let analyses;
      await act(async () => {
        analyses = await result.current.getUserAnalyses('user-123');
      });

      expect(result.current.isLoading).toBe(false);
      expect(analyses).toEqual(mockAnalyses);
      expect(formAnalysisApi.getUserAnalyses).toHaveBeenCalledWith('user-123', 50);
    });

    it('should respect custom limit', async () => {
      (formAnalysisApi.getUserAnalyses as jest.Mock).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useFormAnalysisApi());

      await act(async () => {
        await result.current.getUserAnalyses('user-123', 10);
      });

      expect(formAnalysisApi.getUserAnalyses).toHaveBeenCalledWith('user-123', 10);
    });
  });

  describe('getUserStats', () => {
    it('should get user statistics', async () => {
      const mockStats = {
        totalAnalyses: 10,
        averageScore: 82.5,
        bestScore: 95,
        worstScore: 65,
        byExerciseType: {}
      };

      (formAnalysisApi.getUserStats as jest.Mock).mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() => useFormAnalysisApi());

      let stats;
      await act(async () => {
        stats = await result.current.getUserStats('user-123');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.stats).toEqual(mockStats);
      expect(stats).toEqual(mockStats);
    });
  });

  describe('deleteAnalysis', () => {
    it('should delete analysis', async () => {
      (formAnalysisApi.deleteAnalysis as jest.Mock).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useFormAnalysisApi());

      await act(async () => {
        await result.current.deleteAnalysis('analysis-1');
      });

      expect(result.current.isLoading).toBe(false);
      expect(formAnalysisApi.deleteAnalysis).toHaveBeenCalledWith('analysis-1');
    });

    it('should clear lastSaved if deleted ID matches', async () => {
      const mockSavedAnalysis = {
        id: 'analysis-1',
        userId: 'user-123',
        exerciseType: 'squat',
        formScore: 85,
        metrics: {},
        warnings: [],
        recommendations: [],
        createdAt: Date.now()
      };

      (formAnalysisApi.saveAnalysis as jest.Mock).mockResolvedValueOnce(mockSavedAnalysis);
      (formAnalysisApi.deleteAnalysis as jest.Mock).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useFormAnalysisApi());

      // Set lastSaved
      await act(async () => {
        await result.current.saveAnalysis({
          userId: 'user-123',
          exerciseType: 'squat',
          formScore: 85,
          metrics: {},
          warnings: [],
          recommendations: []
        });
      });

      // Delete the same analysis
      await act(async () => {
        await result.current.deleteAnalysis(mockSavedAnalysis.id);
      });

      expect(result.current.lastSaved).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => useFormAnalysisApi());

      (formAnalysisApi.saveAnalysis as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      await act(async () => {
        await expect(result.current.saveAnalysis({
          userId: 'user-123',
          exerciseType: 'squat',
          formScore: 85,
          metrics: {},
          warnings: [],
          recommendations: []
        })).rejects.toThrow('Test error');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
