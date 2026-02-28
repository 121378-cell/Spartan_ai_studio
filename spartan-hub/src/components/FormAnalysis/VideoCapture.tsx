import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { logger } from '../../utils/logger';
import { VideoCaptureState, FormAnalysisResult, ExerciseType } from '../../types/formAnalysis';
import { useDevice } from '../../context/DeviceContext';

interface VideoCaptureProps {
    exerciseType: ExerciseType;
    onStateChange?: (state: VideoCaptureState) => void;
    onAnalysisComplete?: (result: FormAnalysisResult) => void;
    onFrame?: (video: HTMLVideoElement, timestamp: number) => void;
    width?: number;
    height?: number;
}

export const VideoCapture: React.FC<VideoCaptureProps> = ({ 
    exerciseType, 
    onStateChange, 
    onAnalysisComplete,
    onFrame,
    width: manualWidth, 
    height: manualHeight 
}) => {
    const { isMobile, isTablet } = useDevice();
    const videoRef = useRef<HTMLVideoElement>(null);
    const requestRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);
    const frameCountRef = useRef<number>(0);
    const fpsUpdateTimeRef = useRef<number>(0);

    // Adaptive resolution with FPS throttling for mobile
    const TARGET_FPS = useMemo(() => (isMobile ? 30 : 60), [isMobile]);
    const FRAME_INTERVAL = useMemo(() => 1000 / TARGET_FPS, [TARGET_FPS]);

    const { width, height } = useMemo(() => {
        if (manualWidth && manualHeight) return { width: manualWidth, height: manualHeight };
        if (isMobile) return { width: 360, height: 480 }; // Reduced resolution for mobile performance
        if (isTablet) return { width: 480, height: 640 };
        return { width: 640, height: 480 }; // Standard VGA for desktop to save ML processing time
    }, [isMobile, isTablet, manualWidth, manualHeight]);

    const [state, setState] = useState<VideoCaptureState>({
        isActive: false,
        isRecording: false,
        framesProcessed: 0,
        fps: 0,
        lastFrameTime: 0,
        error: null
    });

    // Notify parent of state changes
    useEffect(() => {
        onStateChange?.(state);
    }, [state, onStateChange]);

    // FPS throttling for better mobile performance
    const animate = useCallback((time: number) => {
        // Throttle frames on mobile to save battery and CPU
        if (time - lastFrameTimeRef.current >= FRAME_INTERVAL) {
            if (videoRef.current && onFrame) {
                onFrame(videoRef.current, time);
                lastFrameTimeRef.current = time;
                
                // Update frame count
                frameCountRef.current++;
                
                // Calculate FPS every second
                if (time - fpsUpdateTimeRef.current >= 1000) {
                    setState(prev => ({
                        ...prev,
                        fps: frameCountRef.current,
                        framesProcessed: prev.framesProcessed + frameCountRef.current
                    }));
                    frameCountRef.current = 0;
                    fpsUpdateTimeRef.current = time;
                }
            }
        }
        requestRef.current = requestAnimationFrame(animate);
    }, [onFrame, FRAME_INTERVAL]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    useEffect(() => {
        let stream: MediaStream | null = null;
        let mounted = true;

        async function setupCamera() {
            try {
                setState(prev => ({ ...prev, isActive: true, error: null }));
                
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: width },
                        height: { ideal: height },
                        facingMode: 'user'
                    },
                    audio: false
                });

                if (mounted && videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        if (mounted) {
                            videoRef.current?.play().catch(e => {
                                logger.error('VideoCapture: Failed to play video', { metadata: { error: e } });
                            });
                        }
                    };
                }
            } catch (err) {
                if (mounted) {
                    const msg = err instanceof Error ? err.message : 'Permissions denied';
                    setState(prev => ({ ...prev, isActive: false, error: `Camera error: ${msg}` }));
                    logger.error('VideoCapture: Failed to access camera', {
                        context: 'form-analysis',
                        metadata: { error: msg }
                    });
                }
            }
        }

        setupCamera();

        return () => {
            mounted = false;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [width, height]);

    const handleManualComplete = useCallback(() => {
        // Mock result for now until analysis engine is integrated
        const mockResult: FormAnalysisResult = {
            exerciseType,
            formScore: 85,
            metrics: {},
            warnings: [],
            recommendations: ['Great job!']
        };
        onAnalysisComplete?.(mockResult);
    }, [exerciseType, onAnalysisComplete]);

    if (state.error) {
        return (
            <div className="flex items-center justify-center bg-gray-900 text-red-500 p-8 rounded-xl border border-red-500/30">
                <p>{state.error}</p>
            </div>
        );
    }

    return (
        <div className="relative rounded-xl overflow-hidden bg-black shadow-2xl border border-spartan-border">
            <video
                ref={videoRef}
                className="w-full h-auto object-cover mirrored"
                style={{ transform: 'scaleX(-1)' }}
                muted
                playsInline
            />
            {/* Status Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${state.isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-xs font-mono text-white/70 uppercase tracking-widest">
                    {exerciseType} Analysis
                </span>
            </div>

            {/* FPS Counter - Performance Monitoring */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className={`px-2 py-1 rounded-md backdrop-blur-sm text-xs font-mono font-bold ${
                    state.fps >= TARGET_FPS * 0.9 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}>
                    {state.fps} FPS
                </div>
                {isMobile && (
                    <div className="px-2 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono">
                        30 FPS
                    </div>
                )}
            </div>

            {/* Frame Counter */}
            <div className="absolute bottom-4 left-4 text-xs font-mono text-white/50">
                Frames: {state.framesProcessed}
            </div>

            {/* Action Button with Enhanced Touch Target */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                 <button
                    onClick={handleManualComplete}
                    className="min-h-[44px] min-w-[44px] px-6 py-3 md:px-4 md:py-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-700/80 active:bg-blue-800/80 backdrop-blur-sm transition text-sm font-medium touch-manipulation shadow-lg hover:shadow-xl active:scale-95"
                    aria-label="Completar análisis"
                >
                    Complete Analysis
                </button>
            </div>
        </div>
    );
};
