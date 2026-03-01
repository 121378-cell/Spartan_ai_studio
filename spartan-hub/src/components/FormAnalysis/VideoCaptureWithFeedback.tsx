/**
 * VideoCapture with Real-time Feedback
 * Phase A: Video Form Analysis MVP
 * 
 * Enhanced VideoCapture component with real-time form feedback
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useRealTimeFeedback } from '../../hooks/useRealTimeFeedback';
import { useFormAnalysisApi } from '../../hooks/useFormAnalysisApi';
import { logger } from '../../utils/logger';

interface VideoCaptureWithFeedbackProps {
  exerciseType: 'squat' | 'deadlift';
  userId: string;
  onFeedbackUpdate?: (feedback: any) => void;
  onAnalysisComplete?: (result: any) => void;
  enableRealTime?: boolean;
  width?: number;
  height?: number;
}

export const VideoCaptureWithFeedback: React.FC<VideoCaptureWithFeedbackProps> = ({
  exerciseType,
  userId,
  onFeedbackUpdate,
  onAnalysisComplete,
  enableRealTime = true,
  width: manualWidth,
  height: manualHeight
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [framesProcessed, setFramesProcessed] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState<any>(null);

  // Initialize hooks
  const {
    connect: connectFeedback,
    disconnect: disconnectFeedback,
    sendLandmarks,
    lastFeedback,
    feedbackHistory
  } = useRealTimeFeedback({
    enableRealTime,
    maxHistorySize: 50,
    onFeedback: (feedback) => {
      setCurrentFeedback(feedback);
      if (onFeedbackUpdate) {
        onFeedbackUpdate(feedback);
      }
    },
    onWarning: (warning) => {
      logger.warn('Form warning', {
        context: 'video-capture-feedback',
        metadata: { warning, exerciseType }
      });
    },
    onCriticalAlert: (feedback) => {
      logger.error('Critical injury risk!', {
        context: 'video-capture-feedback',
        metadata: {
          exerciseType,
          formScore: feedback.formScore,
          injuryRiskLevel: feedback.injuryRiskLevel
        }
      });
      // Auto-stop recording on critical risk
      if (isRecording) {
        handleStopRecording();
      }
    }
  });

  const { saveAnalysis } = useFormAnalysisApi();

  // Connect to WebSocket when recording starts
  useEffect(() => {
    if (isRecording && enableRealTime) {
      const sessionId = `${userId}-${exerciseType}-${Date.now()}`;
      connectFeedback(sessionId).catch((err) => {
        logger.error('Failed to connect feedback', {
          context: 'video-capture-feedback',
          metadata: { error: err }
        });
      });
    }

    return () => {
      disconnectFeedback();
    };
  }, [isRecording, userId, exerciseType, enableRealTime, connectFeedback, disconnectFeedback]);

  /**
   * Start recording with real-time feedback
   */
  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: manualWidth || 640 },
          height: { ideal: manualHeight || 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsRecording(true);
        setFramesProcessed(0);

        logger.info('Recording started', {
          context: 'video-capture-feedback',
          metadata: { exerciseType }
        });
      }
    } catch (error) {
      logger.error('Failed to start recording', {
        context: 'video-capture-feedback',
        metadata: { error }
      });
      throw error;
    }
  }, [manualWidth, manualHeight]);

  /**
   * Stop recording and save analysis
   */
  const handleStopRecording = useCallback(async () => {
    if (!videoRef.current?.srcObject) return;

    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
    videoRef.current.srcObject = null;
    setIsRecording(false);

    // Disconnect feedback
    disconnectFeedback();

    // Save analysis if we have feedback
    if (lastFeedback && onAnalysisComplete) {
      try {
        const analysisData = {
          userId,
          exerciseType,
          formScore: lastFeedback.formScore,
          metrics: {
            repsCompleted: lastFeedback.currentRep,
            durationSeconds: Math.floor(framesProcessed / 30), // Approximate from frames
            injuryRiskScore: lastFeedback.injuryRiskLevel === 'critical' ? 100 :
                            lastFeedback.injuryRiskLevel === 'high' ? 75 :
                            lastFeedback.injuryRiskLevel === 'medium' ? 50 : 25
          },
          warnings: lastFeedback.warnings,
          recommendations: lastFeedback.feedback
        };

        const saved = await saveAnalysis(analysisData);
        logger.info('Analysis saved', {
          context: 'video-capture-feedback',
          metadata: { id: saved.id, formScore: saved.formScore }
        });

        if (onAnalysisComplete) {
          onAnalysisComplete(saved);
        }
      } catch (error) {
        logger.error('Failed to save analysis', {
          context: 'video-capture-feedback',
          metadata: { error }
        });
      }
    }

    logger.info('Recording stopped', {
      context: 'video-capture-feedback',
      metadata: { framesProcessed }
    });
  }, [disconnectFeedback, lastFeedback, userId, exerciseType, framesProcessed, saveAnalysis, onAnalysisComplete]);

  /**
   * Process frame and send landmarks
   */
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isRecording) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get frame data for pose detection
    const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // TODO: Integrate with poseDetection service to extract landmarks
    // For now, send placeholder data
    const mockLandmarks = Array(33).fill(null).map(() => ({
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 0.9
    }));

    // Send landmarks for real-time analysis
    if (enableRealTime) {
      sendLandmarks(exerciseType, mockLandmarks, {
        currentRep: Math.floor(framesProcessed / 60) + 1 // Approximate rep count
      });
    }

    setFramesProcessed(prev => prev + 1);

    // Continue processing
    if (isRecording) {
      requestAnimationFrame(processFrame);
    }
  }, [isRecording, exerciseType, enableRealTime, sendLandmarks, framesProcessed]);

  /**
   * Start frame processing when recording starts
   */
  useEffect(() => {
    if (isRecording) {
      requestAnimationFrame(processFrame);
    }
  }, [isRecording, processFrame]);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full h-auto rounded-lg"
        playsInline
        muted
        style={{ display: isRecording ? 'block' : 'none' }}
      />
      <canvas
        ref={canvasRef}
        className="hidden"
      />
      
      {/* Feedback Overlay */}
      {isRecording && currentFeedback && (
        <div className="absolute top-4 right-4 bg-black/70 text-white p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              currentFeedback.injuryRiskLevel === 'critical' ? 'bg-red-500' :
              currentFeedback.injuryRiskLevel === 'high' ? 'bg-orange-500' :
              currentFeedback.injuryRiskLevel === 'medium' ? 'bg-yellow-500' :
              'bg-green-500'
            }`} />
            <span className="font-bold">Form Score: {currentFeedback.formScore}</span>
          </div>
          
          {currentFeedback.feedback.length > 0 && (
            <div className="text-sm">
              {currentFeedback.feedback.map((item: string, index: number) => (
                <div key={index} className="mb-1">• {item}</div>
              ))}
            </div>
          )}
          
          {currentFeedback.warnings.length > 0 && (
            <div className="text-sm text-red-400 mt-2">
              {currentFeedback.warnings.map((warning: string, index: number) => (
                <div key={index} className="mb-1">⚠️ {warning}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="mt-4 flex gap-4">
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            className="px-6 py-3 bg-spartan-primary text-white rounded-lg hover:bg-spartan-primary/90 transition-colors"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={handleStopRecording}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Stop & Analyze
          </button>
        )}
      </div>

      {/* Stats */}
      {isRecording && (
        <div className="mt-4 text-sm text-gray-400">
          <div>Frames: {framesProcessed}</div>
          <div>FPS: ~30</div>
          <div>Duration: {Math.floor(framesProcessed / 30)}s</div>
        </div>
      )}
    </div>
  );
};

export default VideoCaptureWithFeedback;
