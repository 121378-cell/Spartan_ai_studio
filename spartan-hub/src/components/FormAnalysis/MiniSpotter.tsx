import React, { useState, useEffect } from 'react';
import { VideoCapture } from './VideoCapture';
import PoseOverlay from './PoseOverlay';
import { useFormAnalysis } from '../../hooks/useFormAnalysis';
import { ExerciseType } from '../../types/formAnalysis';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, X, Activity, Brain } from 'lucide-react';

interface MiniSpotterProps {
    exerciseType: ExerciseType;
    onRepComplete?: (count: number) => void;
    onAnalysisComplete?: (score: number) => void;
    onClose: () => void;
}

export const MiniSpotter: React.FC<MiniSpotterProps> = ({ 
    exerciseType, 
    onRepComplete, 
    onAnalysisComplete,
    onClose 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const {
        isReady,
        isRecording,
        isCalibrated,
        repCount,
        currentPose,
        lastResult,
        onFrame,
        startRecording,
        stopRecording
    } = useFormAnalysis(exerciseType);

    // Auto-start recording when calibrated
    useEffect(() => {
        if (isCalibrated && !isRecording && isReady) {
            startRecording();
        }
    }, [isCalibrated, isRecording, isReady, startRecording]);

    // Notify parent of rep completion
    useEffect(() => {
        if (repCount > 0) {
            onRepComplete?.(repCount);
        }
    }, [repCount, onRepComplete]);

    return (
        <AnimatePresence>
            <motion.div 
                drag
                dragMomentum={false}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`fixed bottom-20 right-6 z-50 bg-black/80 backdrop-blur-xl border border-spartan-gold/30 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${isExpanded ? 'w-80 h-[400px]' : 'w-48 h-36'}`}
            >
                {/* Header/Controls */}
                <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-20">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                        <span className="text-[8px] font-bold text-white/70 uppercase tracking-widest">IA Spotter</span>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-white/10 rounded">
                            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                        </button>
                        <button onClick={onClose} className="p-1 hover:bg-red-500/20 rounded">
                            <X className="w-3 h-3 text-red-400" />
                        </button>
                    </div>
                </div>

                {/* Video Area */}
                <div className="relative w-full h-full">
                    {!isReady && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                            <Brain className="w-6 h-6 text-spartan-gold animate-pulse" />
                            <span className="text-[8px] text-spartan-gold uppercase">Iniciando...</span>
                        </div>
                    )}
                    
                    {isReady && (
                        <>
                            <VideoCapture 
                                exerciseType={exerciseType} 
                                onFrame={onFrame} 
                                width={isExpanded ? 320 : 192}
                                height={isExpanded ? 400 : 144}
                            />
                            <PoseOverlay 
                                pose={currentPose} 
                                result={lastResult} 
                                width={isExpanded ? 320 : 192}
                                height={isExpanded ? 400 : 144} 
                            />
                            
                            {/* Rep Count Overlay (Compact) */}
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-lg border border-spartan-gold/20">
                                <span className="text-xl font-black text-white tabular-nums">{repCount}</span>
                                <span className="text-[8px] font-bold text-spartan-gold ml-1">REPS</span>
                            </div>

                            {/* Live Score (Expanded Only) */}
                            {isExpanded && lastResult && (
                                <div className="absolute top-10 left-2 right-2 flex flex-col gap-1">
                                    <div className="px-2 py-1 bg-black/60 rounded-lg border border-white/10 flex justify-between items-center">
                                        <span className="text-[8px] text-gray-400 uppercase">Técnica</span>
                                        <span className={`text-xs font-bold ${lastResult.formScore > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {Math.round(lastResult.formScore)}%
                                        </span>
                                    </div>
                                    {lastResult.warnings.length > 0 && (
                                        <div className="px-2 py-1 bg-red-500/20 rounded-lg border border-red-500/30 text-[8px] text-red-200">
                                            ⚠️ {lastResult.warnings[0]}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default MiniSpotter;
