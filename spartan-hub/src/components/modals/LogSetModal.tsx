import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext.tsx';
import type { SetProgress, Routine, RoutineBlock, Exercise, ExerciseDetail } from '../../types.ts';
import { getExerciseMode, ExerciseMode } from '../../utils/getExerciseMode.ts';
import StrengthModeBody from './logSetModes/StrengthModeBody.tsx';
import TimeModeBody from './logSetModes/TimeModeBody.tsx';
import ActivationModeBody from './logSetModes/ActivationModeBody.tsx';
import LoadingSpinner from '../LoadingSpinner.tsx';
import { EXERCISE_LIBRARY } from '../../data/exerciseLibrary.ts';
import FocusIcon from '../icons/FocusIcon.tsx';

const LogSetModal: React.FC = () => {
    const { hideModal, updateSetProgress, activeSession, modal, userProfile } = useAppContext();
    const { blockIndex, exerciseIndex, setIndex } = modal.payload || {};

    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [block, setBlock] = useState<RoutineBlock | null>(null);
    const [exerciseDetail, setExerciseDetail] = useState<ExerciseDetail | null>(null);
    const [mode, setMode] = useState<ExerciseMode | null>(null);
    const [isProgressionSuggested, setIsProgressionSuggested] = useState(false);
    
    // State for Strength mode
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [rir, setRir] = useState<number | undefined>(undefined);

    // State for Time mode
    const [duration, setDuration] = useState(0);
    const [rpe, setRpe] = useState<number | undefined>(5);

    // State for Activation mode
    const [quality, setQuality] = useState<SetProgress['quality']>();
    
    useEffect(() => {
        if (activeSession && blockIndex !== undefined && exerciseIndex !== undefined && setIndex !== undefined) {
            const currentRoutine = activeSession.routine;
            const currentBlock = currentRoutine.blocks[blockIndex];
            const currentExercise = currentBlock.exercises[exerciseIndex];
            const currentSet = activeSession.progress[blockIndex][exerciseIndex].sets[setIndex];
            
            if (currentExercise && currentSet && currentBlock) {
                setExercise(currentExercise);
                setBlock(currentBlock);
                const exerciseMode = getExerciseMode(currentRoutine, currentBlock, currentExercise);
                setMode(exerciseMode);
                
                const recommendedWeight = userProfile.progressionOverrides?.[currentRoutine.id]?.[currentExercise.name]?.recommendedWeight;
                setIsProgressionSuggested(!!recommendedWeight);

                // Pre-populate fields based on mode and saved progress
                setWeight(currentSet.weight || (setIndex === 0 && recommendedWeight ? String(recommendedWeight) : ''));
                setReps(currentSet.reps || '');
                setRir(currentSet.rir);
                setDuration(currentSet.durationSeconds || 0);
                setRpe(currentSet.rpe || 5);
                setQuality(currentSet.quality);
                
                const detail = EXERCISE_LIBRARY.find(ex => ex.name.toLowerCase() === currentExercise.name.toLowerCase());
                setExerciseDetail(detail || null);
            }
        }
    }, [activeSession, blockIndex, exerciseIndex, setIndex, userProfile.progressionOverrides]);


    const handleSave = useCallback(() => {
        let updates: Partial<SetProgress> = { completed: true };

        switch (mode) {
            case 'strength':
                updates = { ...updates, weight, reps, rir };
                break;
            case 'time':
                updates = { ...updates, durationSeconds: duration, rpe };
                break;
            case 'activation':
                updates = { ...updates, quality };
                break;
        }

        updateSetProgress(blockIndex, exerciseIndex, setIndex, updates);
        hideModal();
    }, [mode, weight, reps, rir, duration, rpe, quality, updateSetProgress, blockIndex, exerciseIndex, setIndex, hideModal]);

    const renderBody = () => {
        if (!mode || !exercise || !block) {
            return (
                <div className="min-h-[350px] flex items-center justify-center">
                    <LoadingSpinner />
                </div>
            );
        }

        switch (mode) {
            case 'strength':
                return (
                    <StrengthModeBody
                        weight={weight}
                        setWeight={setWeight}
                        reps={reps}
                        setReps={setReps}
                        rir={rir}
                        setRir={setRir}
                        showRir={exercise.rir !== undefined}
                        onSave={handleSave}
                        exercise={exercise}
                        isProgressionSuggested={isProgressionSuggested}
                    />
                );
            case 'time':
                return <TimeModeBody
                    exercise={exercise}
                    block={block}
                    duration={duration}
                    setDuration={setDuration}
                    rpe={rpe}
                    setRpe={setRpe}
                />;
            case 'activation':
                return <ActivationModeBody 
                            quality={quality}
                            setQuality={setQuality}
                        />;
            default:
                return null;
        }
    };

    if (!exercise) return null;

    return (
        <div>
            {/* Common Header */}
            <h2 className="text-2xl font-bold text-spartan-gold mb-1">Registrar Set {setIndex + 1}</h2>
            <p className="text-spartan-text-secondary mb-4">{exercise.name}</p>

            {exerciseDetail?.biomechanicsFocus && (
                <div className="bg-spartan-card p-3 rounded-lg mb-4 text-center border-l-4 border-spartan-gold">
                    <div className="flex items-center justify-center gap-2">
                        <FocusIcon className="w-4 h-4 text-spartan-gold"/>
                        <p className="text-sm font-bold text-spartan-gold">Foco Biomecánico</p>
                    </div>
                    <p className="text-xs text-spartan-text-secondary italic mt-1">"{exerciseDetail.biomechanicsFocus}"</p>
                </div>
            )}
             {mode === 'strength' && exercise.tempo && (
                <p className="text-center text-sm font-mono text-spartan-text-secondary mb-4">Tempo: {exercise.tempo}</p>
            )}

            {/* Conditional Body */}
            {renderBody()}

            {/* Common Footer */}
            <div className="flex justify-end gap-4 mt-8">
                <button
                    onClick={hideModal}
                    className="py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    className="py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    Guardar Set
                </button>
            </div>
        </div>
    );
};
export default LogSetModal;
