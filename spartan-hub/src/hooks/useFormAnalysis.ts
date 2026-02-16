import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { formAnalysisEngine } from '../services/formAnalysisEngine';
import { VoiceCoachService } from '../services/voiceCoachService';
import { GeminiVisionService } from '../services/geminiVisionService';
import { RepCounterService } from '../services/repCounterService';
import { Pose, FormAnalysisResult, ExerciseType } from '../types/formAnalysis';
import { logger } from '../utils/logger';
import api from '../services/api';
import { useDevice } from '../context/DeviceContext';

export function useFormAnalysis(exerciseType: ExerciseType) {
    const { isMobile } = useDevice();
    const [isReady, setIsReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isCalibrated, setIsCalibrated] = useState(false);
    const [calibrationMessage, setCalibrationMessage] = useState('Buscando cuerpo...');
    const [currentPose, setCurrentPose] = useState<Pose | null>(null);
    const [lastResult, setLastResult] = useState<FormAnalysisResult | null>(null);
    const [repCount, setRepCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Use refs for values that change frequently to avoid re-renders or stale closures in render loop
    const recordingRef = useRef(false);
    const typeRef = useRef(exerciseType);
    const lastFrameTimeRef = useRef(0);
    const repCounter = useMemo(() => new RepCounterService(), []);

    // Performance configuration
    // Mobile: 10 FPS (100ms) - Saves battery, prevents thermal throttling
    // Desktop: 30 FPS (33ms) - Smoother visualization
    const minFrameInterval = isMobile ? 100 : 33;

    useEffect(() => {
        typeRef.current = exerciseType;
        repCounter.reset();
        setRepCount(0);
    }, [exerciseType, repCounter]);

    useEffect(() => {
        async function init() {
            try {
                await formAnalysisEngine.initialize();
                setIsReady(true);
            } catch (err) {
                setError('Failed to initialize AI engine');
                logger.error('useFormAnalysis initialization error', {
                    context: 'form-analysis',
                    metadata: { error: err instanceof Error ? err.message : String(err) }
                });
            }
        }
        init();
    }, []);

    const onFrame = useCallback(async (video: HTMLVideoElement, timestamp: number) => {
        if (!isReady) return;

        // Throttling logic
        const now = Date.now();
        if (now - lastFrameTimeRef.current < minFrameInterval) {
            return;
        }
        lastFrameTimeRef.current = now;

        const pose = formAnalysisEngine.detectPose(video, timestamp);
        setCurrentPose(pose);

        // Calibration logic: check if key joints are visible and centered
        if (!isRecording && pose) {
            const isVisible = pose.keypoints.filter(k => k.score > 0.5).length > 15;
            if (isVisible) {
                if (!isCalibrated) {
                    setIsCalibrated(true);
                    setCalibrationMessage('¡Posición lista! Puedes iniciar.');
                    VoiceCoachService.speak('Cuerpo detectado. Cuando estés listo, inicia.');
                }
            } else {
                if (isCalibrated) {
                    setIsCalibrated(false);
                    setCalibrationMessage('Asegúrate de estar visible de cuerpo completo.');
                }
            }
        }

        if (recordingRef.current && pose) {
            const result = formAnalysisEngine.analyzeForm(pose, typeRef.current);
            
            // Update rep counting
            const { count, justCompleted } = repCounter.processPose(pose, typeRef.current);
            if (justCompleted) {
                setRepCount(count);
                VoiceCoachService.speak(count.toString(), 'high');
            }

            setLastResult({ ...result, repCount: count });
        }
    }, [isReady, isRecording, isCalibrated, repCounter]);

    const startRecording = useCallback(() => {
        recordingRef.current = true;
        setIsRecording(true);
        setLastResult(null);
        setRepCount(0);
        repCounter.reset();
        VoiceCoachService.silence();
    }, [repCounter]);

    const stopRecording = useCallback(async () => {
        recordingRef.current = false;
        setIsRecording(false);

        if (lastResult) {
            try {
                // Request qualitative AI feedback as well
                let finalResult = { ...lastResult, repCount };
                if (currentPose) {
                    const aiFeedback = await GeminiVisionService.getQualitativeFeedback(typeRef.current, currentPose);
                    finalResult.recommendations = [...(finalResult.recommendations || []), ...aiFeedback];
                }

                await api.saveFormAnalysis(finalResult);
                logger.info('Form analysis persisted to backend', { metadata: { exerciseType: finalResult.exerciseType, repCount } });
            } catch (err) {
                logger.error('Failed to persist form analysis', { metadata: { error: err } });
            }
        }
    }, [lastResult, currentPose, repCount]);

    const reset = useCallback(() => {
        recordingRef.current = false;
        setIsRecording(false);
        setLastResult(null);
        setCurrentPose(null);
        setRepCount(0);
        repCounter.reset();
        setIsCalibrated(false);
        setCalibrationMessage('Buscando cuerpo...');
        VoiceCoachService.silence();
    }, [repCounter]);

    return {
        isReady,
        isRecording,
        isCalibrated,
        calibrationMessage,
        currentPose,
        lastResult,
        repCount,
        error,
        onFrame,
        startRecording,
        stopRecording,
        reset
    };
}
