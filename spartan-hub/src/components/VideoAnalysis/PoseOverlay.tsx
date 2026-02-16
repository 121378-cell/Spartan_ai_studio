/**
 * PoseOverlay Component
 * 
 * Renders MediaPipe landmarks and skeletal connections on video canvas
 * with real-time visualization of pose keypoints, confidence levels, and measurements.
 * 
 * @component
 */

import React, { useEffect, useRef, useState } from 'react';
import type { PoseFrame, FormAnalysisResult, Landmark } from '../../types/pose';
import { POSE_LANDMARKS } from '../../types/pose';
import './PoseOverlay.css';

interface PoseOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  currentFrame: PoseFrame | null;
  formScore: number;
  analysisResult?: FormAnalysisResult | null;
  isMobile?: boolean;
}

/**
 * Connection pairs for skeleton visualization
 * Each pair represents a line between two keypoints
 */
const SKELETON_CONNECTIONS: Array<[number, number]> = [
  // Left arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  // Right arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  // Left leg
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  // Right leg
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
  // Spine/torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
];

/**
 * Get color based on confidence level
 * Green: High confidence (>0.5)
 * Yellow: Medium (0.3-0.5)
 * Red: Low (<0.3)
 */
const getConfidenceColor = (confidence: number): string => {
  if (confidence > 0.5) return '#00FF00'; // Green
  if (confidence > 0.3) return '#FFFF00'; // Yellow
  return '#FF0000'; // Red
};

/**
 * Get score color (green to red gradient based on score 0-100)
 */
const getScoreColor = (score: number): string => {
  if (score >= 85) return '#00FF00'; // Green - excellent
  if (score >= 70) return '#FFFF00'; // Yellow - good
  if (score >= 50) return '#FFA500'; // Orange - fair
  return '#FF0000'; // Red - poor
};

/**
 * Format angle measurement in degrees
 */
const formatAngle = (angle: number): string => {
  return `${Math.round(angle)}°`;
};

export const PoseOverlay: React.FC<PoseOverlayProps> = ({
  canvasRef,
  currentFrame,
  formScore,
  analysisResult,
  isMobile = false,
}) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update canvas dimensions when video loads
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvas.parentElement) {
      const { width, height } = canvas.parentElement.getBoundingClientRect();
      setDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;
    }
  }, [canvasRef]);

  // Draw overlay every time currentFrame changes
  useEffect(() => {
    if (!canvasRef.current || !currentFrame || !dimensions.width) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get sizing based on device type
    const keypointRadius = isMobile ? 6 : 8;
    const connectionWidth = isMobile ? 1.5 : 2;
    const fontSize = isMobile ? 12 : 14;

    // Draw skeleton connections first (behind keypoints)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = connectionWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    SKELETON_CONNECTIONS.forEach(([start, end]) => {
      const startLandmark = currentFrame.landmarks[start];
      const endLandmark = currentFrame.landmarks[end];

      if (startLandmark && endLandmark && startLandmark.visibility > 0.3 && endLandmark.visibility > 0.3) {
        const startX = startLandmark.x * canvas.width;
        const startY = startLandmark.y * canvas.height;
        const endX = endLandmark.x * canvas.width;
        const endY = endLandmark.y * canvas.height;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });

    // Draw keypoints (on top of connections)
    currentFrame.landmarks.forEach((landmark) => {
      if (landmark.visibility > 0.3) {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        const color = getConfidenceColor(landmark.visibility);

        // Draw keypoint circle
        ctx.beginPath();
        ctx.arc(x, y, keypointRadius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // Draw keypoint border for contrast
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Draw form score badge
    drawFormScoreBadge(ctx, canvas, formScore, fontSize, isMobile);

    // Draw angle measurements if available
    if (analysisResult) {
      drawAngleMeasurements(ctx, canvas, currentFrame, fontSize, isMobile);
    }

    // Draw legend
    drawLegend(ctx, canvas, fontSize, isMobile);
  }, [currentFrame, canvasRef, dimensions, formScore, analysisResult, isMobile]);

  return null; // This component only handles canvas drawing
};

/**
 * Draw the form score badge in the top-right corner
 */
function drawFormScoreBadge(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  score: number,
  fontSize: number,
  isMobile: boolean
): void {
  const color = getScoreColor(score);
  const padding = isMobile ? 8 : 12;
  const badgeX = canvas.width - (isMobile ? 80 : 100);
  const badgeY = padding;
  const badgeWidth = isMobile ? 75 : 90;
  const badgeHeight = fontSize + padding;

  // Draw background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

  // Draw border
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);

  // Draw text
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Score: ${Math.round(score)}`, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
}

/**
 * Draw angle measurements for key joints
 * Displays hip, knee, and shoulder angles
 */
function drawAngleMeasurements(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  frame: PoseFrame,
  fontSize: number,
  isMobile: boolean
): void {
  const landmarks = frame.landmarks;

  // Get key landmarks
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];

  const measurements: Array<{ label: string; angle: number; x: number; y: number }> = [];

  // Calculate left hip angle (shoulder-hip-knee)
  if (leftShoulder && leftHip && leftKnee && leftHip.visibility > 0.5) {
    const angle = calculateAngle(leftShoulder, leftHip, leftKnee);
    measurements.push({
      label: 'L Hip',
      angle,
      x: leftHip.x * canvas.width,
      y: leftHip.y * canvas.height,
    });
  }

  // Calculate right hip angle
  if (rightShoulder && rightHip && rightKnee && rightHip.visibility > 0.5) {
    const angle = calculateAngle(rightShoulder, rightHip, rightKnee);
    measurements.push({
      label: 'R Hip',
      angle,
      x: rightHip.x * canvas.width,
      y: rightHip.y * canvas.height,
    });
  }

  // Calculate left knee angle (hip-knee-ankle)
  if (leftHip && leftKnee && landmarks[POSE_LANDMARKS.LEFT_ANKLE] && leftKnee.visibility > 0.5) {
    const angle = calculateAngle(leftHip, leftKnee, landmarks[POSE_LANDMARKS.LEFT_ANKLE]);
    measurements.push({
      label: 'L Knee',
      angle,
      x: leftKnee.x * canvas.width,
      y: leftKnee.y * canvas.height,
    });
  }

  // Calculate right knee angle
  if (rightHip && rightKnee && landmarks[POSE_LANDMARKS.RIGHT_ANKLE] && rightKnee.visibility > 0.5) {
    const angle = calculateAngle(rightHip, rightKnee, landmarks[POSE_LANDMARKS.RIGHT_ANKLE]);
    measurements.push({
      label: 'R Knee',
      angle,
      x: rightKnee.x * canvas.width,
      y: rightKnee.y * canvas.height,
    });
  }

  // Draw angle measurements
  ctx.font = `${fontSize - 2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  measurements.forEach((measurement) => {
    const bgWidth = isMobile ? 45 : 55;
    const bgHeight = fontSize;

    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(measurement.x - bgWidth / 2, measurement.y, bgWidth, bgHeight);

    // Draw text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${measurement.label}: ${formatAngle(measurement.angle)}`, measurement.x, measurement.y + 2);
  });
}

/**
 * Draw confidence legend
 */
function drawLegend(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  fontSize: number,
  isMobile: boolean
): void {
  const legendItems = [
    { color: '#00FF00', label: 'High (>0.5)' },
    { color: '#FFFF00', label: 'Med (0.3-0.5)' },
    { color: '#FF0000', label: 'Low (<0.3)' },
  ];

  const legendX = isMobile ? 8 : 12;
  let legendY = isMobile ? 8 : 12;
  const itemHeight = fontSize + 4;
  const dotRadius = 3;

  ctx.font = `${fontSize - 2}px Arial`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  legendItems.forEach((item) => {
    // Draw colored dot
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legendX + dotRadius, legendY + itemHeight / 2, dotRadius, 0, 2 * Math.PI);
    ctx.fill();

    // Draw label
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(item.label, legendX + 10, legendY + itemHeight / 2);

    legendY += itemHeight;
  });
}

/**
 * Calculate angle between three points using law of cosines
 * Returns angle in degrees
 */
function calculateAngle(p1: Landmark, vertex: Landmark, p2: Landmark): number {
  // Vector from vertex to p1
  const v1x = p1.x - vertex.x;
  const v1y = p1.y - vertex.y;

  // Vector from vertex to p2
  const v2x = p2.x - vertex.x;
  const v2y = p2.y - vertex.y;

  // Dot product
  const dotProduct = v1x * v2x + v1y * v2y;

  // Magnitudes
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (mag1 === 0 || mag2 === 0) return 0;

  // Cosine angle
  const cosAngle = dotProduct / (mag1 * mag2);

  // Clamp to [-1, 1] to avoid NaN from floating point errors
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));

  // Return angle in degrees
  return Math.acos(clampedCosAngle) * (180 / Math.PI);
}
