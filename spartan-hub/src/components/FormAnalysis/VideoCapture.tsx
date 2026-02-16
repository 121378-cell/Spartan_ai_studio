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

    // Adaptive resolution
    const { width, height } = useMemo(() => {
        if (manualWidth && manualHeight) return { width: manualWidth, height: manualHeight };
        if (isMobile) return { width: 480, height: 640 }; // Portrait for mobile
        if (isTablet) return { width: 640, height: 480 };
        return { width: 1280, height: 720 }; // HD for desktop
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

    const animate = useCallback((time: number) => {
        if (videoRef.current && onFrame) {
            onFrame(videoRef.current, time);
        }
        requestRef.current = requestAnimationFrame(animate);
    }, [onFrame]);

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
            <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${state.isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-xs font-mono text-white/70 uppercase tracking-widest">
                    {exerciseType} Analysis
                </span>
            </div>
            
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                 <button
                    onClick={handleManualComplete}
                    className="px-4 py-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-700/80 backdrop-blur-sm transition text-sm font-medium"
                >
                    Complete Analysis
                </button>
            </div>
        </div>
    );
};
