import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { VideoCaptureState, PoseFrame, FormAnalysisResult } from '../../types/pose';
import { getPoseDetectionService } from '../../services/poseDetection';
import { analyzeSquatForm, analyzeDeadliftForm } from '../../utils/formAnalysis';
import { useDevice } from '../../context/DeviceContext';

interface VideoCaptureProps {
  exerciseType: 'squat' | 'deadlift';
  onStateChange?: (state: VideoCaptureState) => void;
  onAnalysisComplete?: (result: FormAnalysisResult) => void;
}

export const VideoCapture: React.FC<VideoCaptureProps> = ({
  exerciseType,
  onStateChange,
  onAnalysisComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastProcessedTimeRef = useRef<number>(0);
  const frameSkipCounterRef = useRef<number>(0);
  
  // Mobile optimization state
  const { isMobile, isTablet, densityFactor } = useDevice();
  const [performanceLevel, setPerformanceLevel] = useState<'high' | 'medium' | 'low'>('high');
  const [processingInterval, setProcessingInterval] = useState<number>(1); // Process every N frames

  const [captureState, setCaptureState] = useState<VideoCaptureState>({
    isActive: false,
    framesProcessed: 0,
    fps: 0,
    lastFrameTime: 0,
    error: null,
  });

  const [poseFrames, setPoseFrames] = useState<PoseFrame[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);

  // Determine video constraints based on device capabilities
  const videoConstraints = useMemo(() => {
    if (isMobile) {
      if (performanceLevel === 'low') {
        return {
          facingMode: 'user' as const,
          width: { ideal: 640, max: 640 },
          height: { ideal: 480, max: 480 },
        };
      } else if (performanceLevel === 'medium') {
        return {
          facingMode: 'user' as const,
          width: { ideal: 960, max: 960 },
          height: { ideal: 540, max: 540 },
        };
      } else {
        return {
          facingMode: 'user' as const,
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
        };
      }
    } else {
      return {
        facingMode: 'user' as const,
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
      };
    }
  }, [isMobile, performanceLevel]);

  // Initialize video stream with mobile optimization
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        // Check if we're on a mobile device and adjust performance settings
        if (isMobile) {
          // Set initial performance level based on hardware concurrency
          const cores = navigator.hardwareConcurrency || 2;
          if (cores <= 2) {
            setPerformanceLevel('low');
            setProcessingInterval(3); // Skip 2 out of 3 frames
          } else if (cores <= 4) {
            setPerformanceLevel('medium');
            setProcessingInterval(2); // Skip 1 out of 2 frames
          } else {
            setPerformanceLevel('high');
            setProcessingInterval(1); // Process all frames
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            startCapture();
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to access camera';
        
        // Handle specific permission errors
        if (error instanceof DOMException) {
          if (error.name === 'NotAllowedError') {
            setCaptureState((prev) => ({
              ...prev,
              error: 'Camera access denied. Please check your browser permissions.',
            }));
          } else if (error.name === 'NotFoundError') {
            setCaptureState((prev) => ({
              ...prev,
              error: 'No camera found on this device.',
            }));
          } else if (error.name === 'NotReadableError') {
            setCaptureState((prev) => ({
              ...prev,
              error: 'Camera is being used by another application.',
            }));
          } else {
            setCaptureState((prev) => ({
              ...prev,
              error: errorMessage,
            }));
          }
        } else {
          setCaptureState((prev) => ({
            ...prev,
            error: errorMessage,
          }));
        }
      }
    };

    initializeCamera();

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [videoConstraints]);

  const startCapture = useCallback(() => {
    const poseService = getPoseDetectionService();

    if (!poseService || !videoRef.current || !canvasRef.current) {
      setCaptureState((prev) => ({
        ...prev,
        error: 'Camera or service not available',
      }));
      return;
    }

    setCaptureState((prev) => ({
      ...prev,
      isActive: true,
      error: null,
      lastFrameTime: performance.now(),
    }));

    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas?.getContext('2d');
    const video = videoRef.current;

    if (!ctx) {
      setCaptureState((prev) => ({
        ...prev,
        error: 'Canvas context not available',
      }));
      return;
    }

    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    if (overlayCanvas && overlayCtx) {
      overlayCanvas.width = video.videoWidth;
      overlayCanvas.height = video.videoHeight;
    }

    const processFrame = async () => {
      try {
        const currentTime = performance.now();
        
        // Adaptive frame processing based on performance
        const timeSinceLastProcess = currentTime - lastProcessedTimeRef.current;
        const minProcessingInterval = 1000 / 15; // Target 15 FPS for mobile
        
        // Only process frame if enough time has passed or if we're on a high-performance device
        if (timeSinceLastProcess >= minProcessingInterval || !isMobile) {
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Implement frame skipping for performance on mobile
          frameSkipCounterRef.current++;
          if (frameSkipCounterRef.current % processingInterval === 0) {
            // Run pose detection
            const poseFrame = await poseService.detectImage(canvas);

            if (poseFrame) {
              setPoseFrames((prev) => {
                const updated = [...prev, poseFrame];
                // Keep last 300 frames (10 seconds at 30fps)
                const kept = updated.slice(-300);
                
                // Auto-analyze after 10 seconds of recording
                if (recordingTime >= 300) {
                  completeAnalysis(kept);
                }
                
                return kept;
              });

              // Draw landmarks on overlay canvas only when needed (reduce drawing overhead)
              if (overlayCtx) {
                drawLandmarks(overlayCtx, poseFrame);
              }

              // Update metrics
              setCaptureState((prev) => {
                const now = performance.now();
                const timeDelta = (now - (prev.lastFrameTime || 0)) / 1000;
                const fps = timeDelta > 0 ? 1 / timeDelta : 0;

                return {
                  ...prev,
                  framesProcessed: (prev.framesProcessed || 0) + 1,
                  fps: fps * 0.3 + (prev.fps || 0) * 0.7, // Exponential moving average
                  lastFrameTime: now,
                };
              });

              setRecordingTime((prev) => prev + 1);
              
              // Update last processed time
              lastProcessedTimeRef.current = currentTime;
            }
          }
        }

        animationRef.current = requestAnimationFrame(processFrame);
      } catch (error) {
        console.error('Frame processing error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Processing error';
        setCaptureState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
      }
    };

    animationRef.current = requestAnimationFrame(processFrame);
  }, [processingInterval, isMobile]);

  const drawLandmarks = (ctx: CanvasRenderingContext2D, poseFrame: PoseFrame) => {
    const confidenceThreshold = 0.5;
    const connectionColor = 'rgba(0, 255, 0, 0.8)';
    const landmarkColor = 'rgba(255, 0, 0, 0.8)';
    const highlightColor = 'rgba(0, 200, 255, 1)';

    // Optimize drawing based on device performance
    const lineWidth = isMobile ? 2 : 3;
    const circleRadius = isMobile ? (isTablet ? 4 : 3) : 4;
    const criticalCircleRadius = isMobile ? (isTablet ? 5 : 4) : 6;

    // Draw connections
    const connections = [
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],
      [11, 12],
      [23, 24],
      [23, 25],
      [24, 26],
      [25, 27],
      [26, 28],
      [27, 29],
      [28, 30],
      [11, 23],
      [12, 24],
    ];

    ctx.strokeStyle = connectionColor;
    ctx.lineWidth = lineWidth;
    
    connections.forEach(([start, end]) => {
      const startLand = poseFrame.landmarks[start];
      const endLand = poseFrame.landmarks[end];

      if (
        startLand &&
        endLand &&
        startLand.visibility >= confidenceThreshold &&
        endLand.visibility >= confidenceThreshold
      ) {
        ctx.beginPath();
        ctx.moveTo(startLand.x * ctx.canvas.width, startLand.y * ctx.canvas.height);
        ctx.lineTo(endLand.x * ctx.canvas.width, endLand.y * ctx.canvas.height);
        ctx.stroke();
      }
    });

    // Draw landmarks
    ctx.fillStyle = landmarkColor;
    poseFrame.landmarks.forEach((landmark, idx) => {
      if (landmark.visibility >= confidenceThreshold) {
        const x = landmark.x * ctx.canvas.width;
        const y = landmark.y * ctx.canvas.height;

        // Highlight critical joints for the exercise
        const isCritical = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26].includes(idx);

        ctx.beginPath();
        ctx.arc(x, y, isCritical ? criticalCircleRadius : circleRadius, 0, 2 * Math.PI);
        ctx.fillStyle = isCritical ? highlightColor : landmarkColor;
        ctx.fill();
      }
    });
  };

  const completeAnalysis = useCallback(
    (frames: PoseFrame[]) => {
      if (frames.length === 0) {
        setCaptureState((prev) => ({
          ...prev,
          error: 'No frames captured',
        }));
        return;
      }

      try {
        let result: FormAnalysisResult;

        if (exerciseType === 'squat') {
          result = analyzeSquatForm(frames);
        } else {
          result = analyzeDeadliftForm(frames);
        }

        // Stop capture
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        setCaptureState((prev) => ({
          ...prev,
          isActive: false,
        }));

        onAnalysisComplete?.(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
        setCaptureState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
      }
    },
    [exerciseType, onAnalysisComplete]
  );

  const handleManualComplete = () => {
    completeAnalysis(poseFrames);
  };

  const handleCancelCapture = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setCaptureState((prev) => ({
      ...prev,
      isActive: false,
    }));
    setPoseFrames([]);
    setRecordingTime(0);
  };

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(captureState);
  }, [captureState, onStateChange]);

  return (
    <div className="space-y-4 w-full">
      {/* Camera Permission Check */}
      {captureState.error && !captureState.error.includes('Camera or service') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          <p className="font-semibold">⚠️ Nota:</p>
          <p>
            Verifica que hayas dado permisos de cámara al navegador. Si no aparece el video,
            recarga la página.
          </p>
        </div>
      )}

      {/* Video Container */}
      <div className={`relative bg-black rounded-lg overflow-hidden ${isMobile ? 'aspect-portrait' : 'aspect-video'}`}>
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: 'none' }}
        />

        {/* Overlay Canvas for Drawing - Now properly referenced */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{
            opacity: 0.8,
            mixBlendMode: 'screen',
          }}
        />

        {/* Recording Indicator */}
        {captureState.isActive && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/80 text-white px-3 py-2 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">
              {Math.floor(recordingTime / 30)}s
            </span>
          </div>
        )}

        {/* Loading State */}
        {!captureState.isActive && captureState.framesProcessed === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white text-sm">Inicializando cámara...</p>
            </div>
          </div>
        )}
      </div>

      {/* Performance indicator for mobile */}
      {isMobile && (
        <div className="flex justify-center">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            performanceLevel === 'high' ? 'bg-green-100 text-green-800' : 
            performanceLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            Rendimiento: {performanceLevel}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 justify-center pt-2">
        {captureState.isActive ? (
          <>
            <button
              onClick={handleManualComplete}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
            >
              ✓ Completar Análisis
            </button>
            <button
              onClick={handleCancelCapture}
              className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium transition"
            >
              ✕ Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              setPoseFrames([]);
              setRecordingTime(0);
              startCapture();
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            disabled={captureState.error !== null}
          >
            ▶ Comenzar Captura
          </button>
        )}
      </div>

      {/* Instructions */}
      {!captureState.isActive && captureState.framesProcessed === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold">📸 Instrucciones:</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Colócate frente a la cámara con buena iluminación</li>
            <li>Asegúrate de que se vea tu cuerpo completo</li>
            <li>Realiza 3-5 repeticiones del ejercicio</li>
            <li>Se analizará automáticamente después de 10 segundos o toca "Completar"</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default VideoCapture;
