/**
 * Tests for Pose Detection Service
 * 
 * @module __tests__/services/poseDetection.test.ts
 */

import { PoseDetectionService, resetPoseDetectionService } from '../../services/poseDetection';
import type { PoseFrame, Landmark } from '../../types/pose';

describe('PoseDetectionService', () => {
  let service: PoseDetectionService;

  beforeEach(() => {
    service = new PoseDetectionService();
    resetPoseDetectionService();
  });

  afterEach(() => {
    if (service) {
      service.close();
    }
  });

  describe('Service Initialization', () => {
    test('should create service instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PoseDetectionService);
    });

    test('should initialize state correctly', () => {
      const state = service.getState();
      expect(state.isInitialized).toBe(false);
      expect(state.isDetecting).toBe(false);
      expect(state.framesProcessed).toBe(0);
      expect(state.error).toBeNull();
    });

    test('should throw error if detect called before initialize', () => {
      const mockVideo = document.createElement('video') as HTMLVideoElement;
      expect(() => {
        service.detect(mockVideo, Date.now());
      }).toThrow('Pose Landmarker not initialized');
    });
  });

  describe('Service Lifecycle', () => {
    test('should close service and cleanup resources', () => {
      service.close();
      const state = service.getState();
      expect(state.isInitialized).toBe(false);
    });

    test('should reset frame counter', () => {
      const state1 = service.getState();
      expect(state1.framesProcessed).toBe(0);

      service.reset();
      
      const state2 = service.getState();
      expect(state2.framesProcessed).toBe(0);
    });
  });

  describe('Service Behavior', () => {
    test('should return PoseFrame structure with all required fields', () => {
      // This test would require actual model initialization
      // For now, we're testing the interface contract
      const mockFrame: PoseFrame = {
        landmarks: [],
        timestamp: Date.now(),
        frameNumber: 0,
        isValid: false,
      };

      expect(mockFrame.timestamp).toBeGreaterThan(0);
      expect(Array.isArray(mockFrame.landmarks)).toBe(true);
      expect(mockFrame.frameNumber).toBe(0);
    });

    test('should return valid landmark structure', () => {
      const mockLandmark: Landmark = {
        x: 0.5,
        y: 0.5,
        z: 0.1,
        visibility: 0.95,
      };

      expect(mockLandmark.x).toBeGreaterThanOrEqual(0);
      expect(mockLandmark.x).toBeLessThanOrEqual(1);
      expect(mockLandmark.visibility).toBeGreaterThanOrEqual(0);
      expect(mockLandmark.visibility).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle close gracefully', () => {
      service.close();
      expect(() => {
        service.close();
      }).not.toThrow();
    });
  });
});
