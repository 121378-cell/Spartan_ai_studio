import React, { useState, useEffect, useRef } from 'react';
import { useDevice } from '../../../context/DeviceContext.tsx';
import type { Exercise, RoutineBlock } from '../../../types.ts';
import RpeSlider from '../../RpeSlider.tsx';
import PlayIcon from '../../icons/PlayIcon.tsx';
import PauseIcon from '../../icons/PauseIcon.tsx';
import CheckIcon from '../../icons/CheckIcon.tsx';

interface TimeModeBodyProps {
    exercise: Exercise;
    block: RoutineBlock;
    duration: number;
    setDuration: (value: number) => void;
    rpe: number | undefined;
    setRpe: (value: number | undefined) => void;
}

type TimerState = 'idle' | 'running' | 'paused';

const TimeModeBody: React.FC<TimeModeBodyProps> = ({ exercise, block, duration, setDuration, rpe, setRpe }) => {
    const { isMobile, isDesktop, densityFactor } = useDevice();
    const [timerState, setTimerState] = useState<TimerState>('idle');
    const timerIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (timerState === 'running') {
            timerIntervalRef.current = window.setInterval(() => {
                setDuration(duration + 1);
            }, 1000);
        } else {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        }
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [timerState, duration, setDuration]);

    const handleStart = () => setTimerState('running');
    const handlePause = () => setTimerState('paused');
    const handleFinish = () => setTimerState('idle'); // Stop the timer but keep the value

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };
    
    const showDensitySuggestion = block.name.toLowerCase().includes('densidad') || block.name.toLowerCase().includes('compensación');

    // Calculate responsive styles based on density factor
    const containerPadding = `${24 * densityFactor}px`;
    const fieldSpacing = `${32 * densityFactor}px`;
    const labelFontSize = `${14 * densityFactor}px`;
    const fieldLabelSpacing = `${8 * densityFactor}px`;
    const timerFontSize = `${56 * densityFactor}px`;

    return (
        <div 
            className={`${isMobile ? 'flex flex-col gap-6' : 'grid grid-cols-1 md:grid-cols-2 gap-8'} items-center min-h-[350px]`}
            style={{ padding: containerPadding }}
        >
            {/* Left Side: Timer */}
            <div className="flex flex-col items-center gap-4">
                <p 
                    className="text-sm font-medium text-spartan-text-secondary"
                    style={{ fontSize: labelFontSize, marginBottom: fieldLabelSpacing }}
                >
                    DURACIÓN (Objetivo: {exercise.reps})
                </p>
                <div 
                    className="font-mono text-spartan-text"
                    style={{ fontSize: timerFontSize }}
                >
                    {formatTime(duration)}
                </div>
                <div className="flex items-center gap-4">
                    {timerState !== 'running' ? (
                         <button onClick={handleStart} className="p-4 bg-green-600 text-white rounded-full hover:bg-green-500 transition-colors">
                             <PlayIcon className="w-8 h-8"/>
                         </button>
                    ) : (
                         <button onClick={handlePause} className="p-4 bg-yellow-500 text-white rounded-full hover:bg-yellow-400 transition-colors">
                             <PauseIcon className="w-8 h-8"/>
                         </button>
                    )}
                     <button onClick={handleFinish} title="Finalizar y mantener tiempo" className="p-4 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors">
                        <CheckIcon className="w-8 h-8" />
                    </button>
                </div>
            </div>
            
            {/* Right Side: RPE */}
            <div className="flex flex-col items-center">
                 <label 
                    className="block text-sm font-medium text-spartan-text-secondary mb-2"
                    style={{ fontSize: labelFontSize, marginBottom: fieldLabelSpacing }}
                 >
                    RPE (Esfuerzo Percibido)
                 </label>
                 <RpeSlider value={rpe} onChange={(val) => setRpe(val)} />
                 {showDensitySuggestion && (
                    <div className="mt-4 p-2 bg-spartan-gold/10 text-spartan-gold text-xs rounded text-center w-full">
                        <p className="font-bold">Sugerencia de Densidad:</p>
                        <p>Apunta a un 8/10 para compensar la carga.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimeModeBody;
