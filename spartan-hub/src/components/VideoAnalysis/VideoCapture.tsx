import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { VideoCaptureState, PoseFrame, FormAnalysisResult } from '../../types/pose';
import { getPoseDetectionService, preloadPoseModel, ModelPreloadState } from '../../services/poseDetection';
import {
  analyzeSquatForm,
  analyzeDeadliftForm,
  analyzePushUpForm,
  analyzePlankForm,
  analyzeRowForm
} from '../../utils/formAnalysis';
import { useDevice } from '../../context/DeviceContext';
import { ExerciseType } from '../../types/formAnalysis';

interface VideoCaptureProps {
  exerciseType: ExerciseType;
  onStateChange?: (state: VideoCaptureState) => void;
  onAnalysisComplete?: (result: FormAnalysisResult) => void;
}

/**
 * Camera permission status
 */
type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

/**
 * VideoCapture Component - Mobile Optimized
 * 
 * Features:
 * - Touch-friendly controls (min 44x44px targets)
 * - Camera permission pre-check
 * - Retry mechanism with user guidance
 * - Safe area inset support for iOS
 * - Responsive layout with mobile-first design
 * - Model preloading with progress indicator
 * - Adaptive performance based on device
 */
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
  const [processingInterval, setProcessingInterval] = useState<number>(1);

  // Permission state
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('unknown');
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Model preload state
  const [preloadState, setPreloadState] = useState<ModelPreloadState>({
    isPreloading: false,
    preloadProgress: 0,
    preloadComplete: false,
    preloadError: null,
    modelSize: 0,
    loadTimeMs: 0,
  });

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

  /**
   * Check camera permission status
   * Pre-check before attempting to access camera
   */
  const checkCameraPermission = useCallback(async (): Promise<PermissionStatus> => {
    try {
      // Check if permissions API is available
      if (!navigator.permissions) {
        setPermissionStatus('unknown');
        return 'unknown';
      }

      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      setPermissionStatus(result.state as PermissionStatus);
      
      // Listen for permission changes
      result.addEventListener('change', () => {
        setPermissionStatus(result.state as PermissionStatus);
      });

      return result.state as PermissionStatus;
    } catch (error) {
      // Permissions API not supported or failed
      console.warn('[VideoCapture] Permission check failed:', error);
      setPermissionStatus('unknown');
      return 'unknown';
    } finally {
      setPermissionChecked(true);
    }
  }, []);

  /**
   * Preload MediaPipe model during component mount
   */
  useEffect(() => {
    const preload = async () => {
      try {
        const service = getPoseDetectionService();
        const state = await service.preloadModel();
        setPreloadState(state);
      } catch (error) {
        console.error('[VideoCapture] Model preload failed:', error);
        setPreloadState(prev => ({
          ...prev,
          preloadError: error instanceof Error ? error.message : 'Failed to load model',
        }));
      }
    };

    preload();
  }, []);

  /**
   * Check permission on mount
   */
  useEffect(() => {
    checkCameraPermission();
  }, [checkCameraPermission]);

  /**
   * Initialize video stream with mobile optimization and permission handling
   */
  useEffect(() => {
    const initializeCamera = async () => {
      // Skip if permission denied
      if (permissionStatus === 'denied') {
        setCaptureState((prev) => ({
          ...prev,
          error: 'Camera permission denied. Please enable camera access in your browser settings.',
        }));
        return;
      }

      try {
        // Check if we're on a mobile device and adjust performance settings
        if (isMobile) {
          const cores = navigator.hardwareConcurrency || 2;
          if (cores <= 2) {
            setPerformanceLevel('low');
            setProcessingInterval(3);
          } else if (cores <= 4) {
            setPerformanceLevel('medium');
            setProcessingInterval(2);
          } else {
            setPerformanceLevel('high');
            setProcessingInterval(1);
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        streamRef.current = stream;
        setRetryCount(0); // Reset retry count on success

        const handleVideoMetadata = () => {
          if (videoRef.current && canvasRef.current && overlayCanvasRef.current) {
            const video = videoRef.current;
            canvasRef.current.width = video.videoWidth;
            canvasRef.current.height = video.videoHeight;
            overlayCanvasRef.current.width = video.videoWidth;
            overlayCanvasRef.current.height = video.videoHeight;

            video.play().then(() => startCapture()).catch(err => console.error("Play error:", err));
          }
        };

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = handleVideoMetadata;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';

        if (error instanceof DOMException) {
          if (error.name === 'NotAllowedError') {
            setPermissionStatus('denied');
            setCaptureState((prev) => ({
              ...prev,
              error: 'Camera access denied. Please allow camera access and try again.',
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
          } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDismissedError') {
            setPermissionStatus('denied');
            setCaptureState((prev) => ({
              ...prev,
              error: 'Camera permission was denied. Please update your browser settings.',
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

    if (permissionChecked && permissionStatus !== 'denied' && preloadState.preloadComplete) {
      initializeCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [videoConstraints, permissionChecked, permissionStatus, preloadState.preloadComplete, isMobile]);

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

    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas?.getContext('2d');
    const video = videoRef.current;

    if (overlayCanvas && video.videoWidth > 0) {
      overlayCanvas.width = video.videoWidth;
      overlayCanvas.height = video.videoHeight;
    }

    const processFrame = async () => {
      try {
        const currentTime = performance.now();

        const timeSinceLastProcess = currentTime - lastProcessedTimeRef.current;
        const minProcessingInterval = isMobile ? 1000 / 15 : 1000 / 30;

        if (timeSinceLastProcess >= minProcessingInterval) {
          frameSkipCounterRef.current++;

          if (frameSkipCounterRef.current % processingInterval === 0) {
            const poseFrame = poseService.detect(video, currentTime);

            if (poseFrame) {
              setPoseFrames((prev) => {
                const updated = [...prev, poseFrame];
                const kept = updated.slice(-180); // Reduced buffer for memory optimization

                if (recordingTime >= 300) {
                  completeAnalysis(kept);
                }

                return kept;
              });

              if (overlayCtx && overlayCanvas) {
                overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                drawLandmarks(overlayCtx, poseFrame);
              }

              setCaptureState((prev) => {
                const now = performance.now();
                const timeDelta = (now - (prev.lastFrameTime || 0)) / 1000;
                const fps = timeDelta > 0 ? 1 / timeDelta : 0;

                return {
                  ...prev,
                  framesProcessed: (prev.framesProcessed || 0) + 1,
                  fps: fps * 0.1 + (prev.fps || 0) * 0.9,
                  lastFrameTime: now,
                };
              });

              setRecordingTime((prev) => prev + 1);
              lastProcessedTimeRef.current = currentTime;
            }
          }
        }

        if (captureState.isActive) {
          animationRef.current = requestAnimationFrame(processFrame);
        }
      } catch (error) {
        console.error('Frame processing error:', error);
        if (error instanceof Error && error.message.includes('not initialized')) {
          setCaptureState((prev) => ({
            ...prev,
            error: error.message,
          }));
        } else {
          if (captureState.isActive) {
            animationRef.current = requestAnimationFrame(processFrame);
          }
        }
      }
    };

    animationRef.current = requestAnimationFrame(processFrame);
  }, [processingInterval, isMobile, captureState.isActive, recordingTime]);

  const drawLandmarks = (ctx: CanvasRenderingContext2D, poseFrame: PoseFrame) => {
    const confidenceThreshold = 0.5;
    const connectionColor = 'rgba(0, 255, 0, 0.8)';
    const landmarkColor = 'rgba(255, 0, 0, 0.8)';
    const highlightColor = 'rgba(0, 200, 255, 1)';

    // Touch-friendly sizing for mobile
    const lineWidth = isMobile ? 3 : 3;
    const circleRadius = isMobile ? 5 : 4;
    const criticalCircleRadius = isMobile ? 7 : 6;

    const connections = [
      [11, 13], [13, 15], [12, 14], [14, 16], [11, 12],
      [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
      [27, 29], [28, 30], [11, 23], [12, 24],
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

    ctx.fillStyle = landmarkColor;
    poseFrame.landmarks.forEach((landmark, idx) => {
      if (landmark.visibility >= confidenceThreshold) {
        const x = landmark.x * ctx.canvas.width;
        const y = landmark.y * ctx.canvas.height;

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

        switch (exerciseType) {
          case 'squat':
            result = analyzeSquatForm(frames);
            break;
          case 'deadlift':
            result = analyzeDeadliftForm(frames);
            break;
          case 'push_up':
            result = analyzePushUpForm(frames);
            break;
          case 'plank':
            result = analyzePlankForm(frames);
            break;
          case 'row':
            result = analyzeRowForm(frames);
            break;
          default:
            result = analyzeSquatForm(frames);
        }

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

  /**
   * Handle retry with permission re-check
   */
  const handleRetryCamera = useCallback(async () => {
    if (retryCount >= maxRetries) {
      setCaptureState((prev) => ({
        ...prev,
        error: 'Maximum retry attempts reached. Please check your camera settings.',
      }));
      return;
    }

    setRetryCount(prev => prev + 1);
    setCaptureState((prev) => ({
      ...prev,
      error: null,
      framesProcessed: 0,
      fps: 0,
      lastFrameTime: 0,
    }));
    setPoseFrames([]);
    setRecordingTime(0);

    // Re-check permission
    const status = await checkCameraPermission();
    if (status === 'denied') {
      setCaptureState((prev) => ({
        ...prev,
        error: 'Camera permission denied. Please enable in browser settings.',
      }));
      return;
    }

    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [retryCount, checkCameraPermission]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(captureState);
  }, [captureState, onStateChange]);

  // Render loading state while model is preloading
  if (!preloadState.preloadComplete && !preloadState.preloadError) {
    return (
      <div className="w-full py-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-600 text-sm font-medium">Cargando modelo de detección...</p>
          <div className="w-64 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${preloadState.preloadProgress}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs">{preloadState.preloadProgress}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Permission Denied State */}
      {permissionStatus === 'denied' && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">📷</div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Permiso de cámara denegado
          </h3>
          <p className="text-sm text-red-700 mb-4">
            Para usar esta función, necesitas permitir el acceso a la cámara en tu navegador.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleRetryCamera}
              disabled={retryCount >= maxRetries}
              className="w-full min-h-[44px] px-6 py-3 bg-red-600 text-white rounded-lg 
                       hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed 
                       font-medium transition-all active:scale-[0.98] touch-manipulation"
            >
              {retryCount >= maxRetries 
                ? `Intentos agotados (${maxRetries}/${maxRetries})`
                : `Reintentar (${retryCount + 1}/${maxRetries})`
              }
            </button>
            <div className="text-xs text-red-600 bg-red-100 rounded-lg p-3">
              <p className="font-semibold mb-1">Cómo habilitar la cámara:</p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>Toca el ícono de candado en la barra de direcciones</li>
                <li>Busca "Cámara" en los permisos</li>
                <li>Cambia a "Permitir"</li>
                <li>Recarga la página</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Model Load Error */}
      {preloadState.preloadError && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
          <p className="font-semibold">⚠️ Error de carga:</p>
          <p>{preloadState.preloadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 min-h-[44px] px-4 py-2 bg-orange-600 text-white rounded-lg 
                     hover:bg-orange-700 font-medium transition-all touch-manipulation"
          >
            Recargar página
          </button>
        </div>
      )}

      {/* Camera Error with Retry */}
      {captureState.error && !captureState.error.includes('Camera or service') && permissionStatus !== 'denied' && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-yellow-900 mb-1">Nota importante:</p>
              <p className="text-sm text-yellow-800 mb-3">{captureState.error}</p>
              <button
                onClick={handleRetryCamera}
                className="min-h-[44px] px-5 py-2.5 bg-yellow-600 text-white rounded-lg 
                         hover:bg-yellow-700 font-medium transition-all active:scale-[0.98] 
                         touch-manipulation text-sm"
              >
                🔄 Reintentar conexión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Container with Safe Area Insets */}
      {permissionStatus !== 'denied' && (
        <div 
          className={`relative bg-black rounded-xl overflow-hidden shadow-lg
                      ${isMobile ? 'aspect-[9/16] max-h-[70vh]' : 'aspect-video'}`}
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
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

          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full"
            style={{
              opacity: 0.8,
              mixBlendMode: 'screen',
            }}
          />

          {/* Recording Indicator - Touch-friendly positioning */}
          {captureState.isActive && (
            <div 
              className="absolute top-4 left-4 right-4 flex items-center justify-between 
                       bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-full 
                       shadow-lg min-h-[44px]"
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-semibold">
                  {Math.floor(recordingTime / 30)}s grabando
                </span>
              </div>
              <span className="text-xs opacity-80">
                {captureState.fps?.toFixed(0) || 0} FPS
              </span>
            </div>
          )}

          {/* Loading State */}
          {!captureState.isActive && captureState.framesProcessed === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center px-4">
                <div className="w-14 h-14 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white text-sm font-medium">Inicializando cámara...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance indicator for mobile */}
      {isMobile && permissionStatus !== 'denied' && (
        <div className="flex justify-center items-center gap-2">
          <div 
            className={`px-4 py-2 rounded-full text-xs font-semibold shadow-sm
                        ${performanceLevel === 'high' ? 'bg-green-100 text-green-800 border border-green-300' :
                performanceLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                  'bg-red-100 text-red-800 border border-red-300'
              }`}
          >
            📱 Rendimiento: {performanceLevel === 'high' ? 'Óptimo' : performanceLevel === 'medium' ? 'Moderado' : 'Económico'}
          </div>
          {captureState.fps && (
            <div className="px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700 border border-gray-300">
              {captureState.fps.toFixed(0)} FPS
            </div>
          )}
        </div>
      )}

      {/* Controls - Touch-friendly with minimum 44x44px targets */}
      <div className="flex gap-3 justify-center pt-3 pb-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {captureState.isActive ? (
          <>
            <button
              onClick={handleManualComplete}
              className="min-h-[48px] min-w-[48px] px-6 py-3 bg-green-600 text-white 
                       rounded-xl hover:bg-green-700 font-semibold transition-all 
                       active:scale-[0.95] shadow-md hover:shadow-lg touch-manipulation
                       flex items-center gap-2"
            >
              <span>✓</span>
              <span>Completar</span>
            </button>
            <button
              onClick={handleCancelCapture}
              className="min-h-[48px] min-w-[48px] px-6 py-3 border-2 border-red-300 
                       text-red-600 rounded-xl hover:bg-red-50 font-semibold transition-all 
                       active:scale-[0.95] touch-manipulation"
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
            disabled={captureState.error !== null || permissionStatus === 'denied'}
            className="min-h-[48px] min-w-[48px] px-8 py-3 bg-blue-600 text-white 
                     rounded-xl hover:bg-blue-700 disabled:bg-gray-400 
                     disabled:cursor-not-allowed font-semibold transition-all 
                     active:scale-[0.95] shadow-md hover:shadow-lg touch-manipulation"
          >
            ▶ Comenzar Captura
          </button>
        )}
      </div>

      {/* Instructions - Mobile-friendly layout */}
      {!captureState.isActive && captureState.framesProcessed === 0 && permissionStatus !== 'denied' && (
        <div 
          className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 text-sm text-blue-900"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📸</span>
            <p className="font-bold text-blue-900">Instrucciones:</p>
          </div>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Colócate frente a la cámara con buena iluminación</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Asegúrate de que se vea tu cuerpo completo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Realiza 3-5 repeticiones del ejercicio</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Se analizará automáticamente después de 10 segundos</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default VideoCapture;
