import React, { useState } from 'react';
import { VideoCapture } from './VideoCapture';
import PoseOverlay from './PoseOverlay';
import GhostFrame from './GhostFrame';
import FormScoreCard from './FormScoreCard';
import FormTrends from './FormTrends';
import FormHistoryList from './FormHistoryList';
import { useFormAnalysis } from '../../hooks/useFormAnalysis';
import { useAuth } from '../../hooks/useAuth';
import { ExerciseType, ExercisePattern } from '../../types/formAnalysis';
import { ExerciseAnalysisMapper } from '../../services/exerciseAnalysisMapper';
import BrainIcon from '../icons/BrainIcon';
import AlertTriangleIcon from '../icons/AlertTriangleIcon';

interface FormAnalysisModalProps {
    onClose: () => void;
    initialExercise?: string; // Changed to string to support names or IDs
}

const FormAnalysisModal: React.FC<FormAnalysisModalProps> = ({ onClose, initialExercise = 'squat' }) => {
    const { user } = useAuth();
    // Resolve metadata from mapper
    const metadata = ExerciseAnalysisMapper.getAnalysisMetadata(initialExercise);
    const [exercise, setExercise] = useState<ExerciseType>(metadata?.type || 'squat');
    const [pattern, setPattern] = useState<ExercisePattern>(metadata?.pattern || 'squat');
    const {
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
    } = useFormAnalysis(exercise);

    return (
        <div 
            className="flex flex-col h-full max-h-[90vh] bg-spartan-surface text-white"
            role="dialog"
            aria-labelledby="modal-title"
        >
            {/* Header */}
            <div className="p-6 border-b border-spartan-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-spartan-primary/20 rounded-lg">
                        <BrainIcon className="w-6 h-6 text-spartan-gold" />
                    </div>
                    <div>
                        <h2 id="modal-title" className="text-xl font-bold">Análisis de Forma IA</h2>
                        <p className="text-sm text-gray-400">Corrección técnica en tiempo real</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Cerrar modal"
                >
                    <span className="sr-only">Cerrar</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                        <AlertTriangleIcon className="w-5 h-5" />
                        <p>{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Analysis View */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            {/* Exercise Selector with Enhanced Touch Targets */}
                            <div className="flex flex-wrap p-1 bg-black/40 rounded-lg border border-white/5 gap-1" role="group" aria-label="Selector de ejercicios">
                                {['squat', 'deadlift', 'push_up', 'row', 'lunge'].map((ex: any) => (
                                    <button
                                        key={ex}
                                        onClick={() => {
                                            setExercise(ex as ExerciseType);
                                            const meta = ExerciseAnalysisMapper.getAnalysisMetadata(ex);
                                            if (meta) setPattern(meta.pattern);
                                            reset();
                                        }}
                                        className={`min-h-[44px] min-w-[44px] px-4 py-2 md:px-3 md:py-1.5 rounded-md text-xs md:text-xs font-medium transition-all capitalize touch-manipulation active:scale-95 ${
                                            exercise === ex 
                                                ? 'bg-spartan-gold text-black shadow-lg' 
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                        aria-pressed={exercise === ex}
                                    >
                                        {ex.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Latency Indicator */}
                            <div className="flex items-center gap-2 text-xs font-mono text-gray-500 bg-black/30 px-3 py-2 rounded-lg">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Latencia: <span className="text-green-400 font-bold">~12ms</span>
                            </div>
                        </div>

                        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-spartan-border shadow-inner">
                            {!isReady && !error && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-50">
                                    <div className="w-12 h-12 border-4 border-spartan-gold border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="text-sm font-medium animate-pulse text-spartan-gold/80">Cargando modelos de IA...</p>
                                </div>
                            )}

                            {isReady && !isRecording && (
                                <div 
                                    className={`absolute top-4 right-4 z-40 px-3 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-2 transition-all ${isCalibrated ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-spartan-primary/20 border-spartan-primary/40 text-spartan-gold'}`}
                                    role="status"
                                    aria-live="polite"
                                >
                                    <div className={`w-2 h-2 rounded-full ${isCalibrated ? 'bg-green-400 animate-pulse' : 'bg-spartan-gold'}`} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{calibrationMessage}</span>
                                </div>
                            )}

                            {isReady && (
                                <>
                                    <VideoCapture 
                                        exerciseType={exercise} 
                                        onFrame={onFrame} 
                                    />
                                    {isRecording && (
                                        <div 
                                            className="absolute top-4 left-4 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl border border-spartan-gold/30 rounded-2xl p-4 min-w-[80px] shadow-2xl animate-scaleIn"
                                            role="status"
                                            aria-live="assertive"
                                        >
                                            <span className="text-[10px] font-bold text-spartan-gold uppercase tracking-[0.2em] mb-1">Reps</span>
                                            <span className="text-5xl font-black text-white leading-none tabular-nums">{repCount}</span>
                                        </div>
                                    )}
                                    <GhostFrame
                                        isVisible={!isRecording && isReady}
                                        imageUrl={ExerciseAnalysisMapper.getGhostFrameUrl(pattern, metadata?.suggestedView || 'lateral')}
                                    />
                                    <PoseOverlay pose={currentPose} result={lastResult} width={640} height={480} />
                                </>
                            )}
                        </div>

                        <div className="flex justify-center gap-4">
                            {!isRecording ? (
                                <button
                                    onClick={startRecording}
                                    disabled={!isReady || !isCalibrated}
                                    className="px-8 py-3 bg-spartan-primary hover:bg-spartan-primary-dark disabled:opacity-30 disabled:grayscale text-white rounded-xl font-bold shadow-lg shadow-spartan-primary/20 transition-all transform hover:scale-105"
                                >
                                    {isCalibrated ? 'Iniciar Análisis' : 'Calibrando...'}
                                </button>
                            ) : (
                                <button
                                    onClick={stopRecording}
                                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all transform hover:scale-105 flex items-center gap-2"
                                >
                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    Detener Análisis
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Metrics & Feedback */}
                    <div className="space-y-6">
                        {lastResult ? (
                            <FormScoreCard result={lastResult} />
                        ) : (
                            <div className="spartan-card p-12 flex flex-col items-center justify-center text-center space-y-4 bg-gradient-to-br from-spartan-surface to-black/40 border border-dashed border-spartan-border">
                                <div className="p-4 bg-spartan-primary/10 rounded-full">
                                    <BrainIcon className="w-8 h-8 text-spartan-gold/40" />
                                </div>
                                <div>
                                    <h3 className="text-gray-400 font-bold">Esperando Datos</h3>
                                    <p className="text-sm text-gray-600 max-w-[200px]">Inicia el análisis para recibir correcciones técnicas en vivo.</p>
                                </div>
                            </div>
                        )}

                        {/* Trend Visualization */}
                        {user && (
                            <>
                                <FormTrends userId={user.userId} exerciseType={exercise} />
                                <FormHistoryList userId={user.userId} exerciseType={exercise} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormAnalysisModal;
