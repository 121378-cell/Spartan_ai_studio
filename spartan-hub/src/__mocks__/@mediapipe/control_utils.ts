/**
 * Mock for @mediapipe/control_utils
 * 
 * Provides mock implementations for drawing utilities used in pose visualization.
 */

export const drawConnectors = jest.fn();
export const drawLandmarks = jest.fn();

export default {
  drawConnectors,
  drawLandmarks,
};
