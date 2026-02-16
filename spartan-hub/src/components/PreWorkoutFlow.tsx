import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import BrainIcon from './icons/BrainIcon.tsx';
import ClockIcon from './icons/ClockIcon.tsx';

const ACTIVATION_DURATION = 60; // seconds

const prompts = [
    { text: "Cierra los ojos. Realiza 3 respiraciones profundas. Siente tu cuerpo.", startTime: 0 },
    { text: "Visualiza tu primer ejercicio. Siente el peso. Imagina la contracción muscular.", startTime: 15 },
    { text: "Ejecuta una repetición perfecta en tu mente. Fuerte. Controlada. Exitosa.", startTime: 35 },
    { text: "Siente la confianza. Estás preparado. Estás fuerte.", startTime: 55 }
];

const PreWorkoutFlow: React.FC = () => {
    const { pendingWorkoutRoutine, proceedToSession, showModal } = useAppContext();
    const [countdown, setCountdown] = useState(ACTIVATION_DURATION);
    const [currentPrompt, setCurrentPrompt] = useState(prompts[0].text);

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(prev => {
                const newTime = prev - 1;
                if (newTime <= 0) {
                    clearInterval(interval);
                    setCurrentPrompt("Siente la confianza. Estás preparado. Estás fuerte.");
                    return 0;
                }

                const elapsed = ACTIVATION_DURATION - newTime;
                const activePrompt = prompts.slice().reverse().find(p => elapsed >= p.startTime);
                if (activePrompt) {
                    setCurrentPrompt(activePrompt.text);
                }

                return newTime;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const progress = (ACTIVATION_DURATION - countdown) / ACTIVATION_DURATION;
    const offset = circumference * (1 - progress);
    const isFinished = countdown === 0;

    if (!pendingWorkoutRoutine) {
        return null; // Should not happen if flow is active, but a good safeguard
    }

    return (
        <div className="fixed inset-0 bg-spartan-bg z-50 flex flex-col items-center justify-center p-4 animate-fadeIn">
            <h1 className="text-3xl font-bold text-spartan-gold mb-2">Protocolo Pre-Carga</h1>
            <p className="text-xl text-spartan-text-secondary mb-4 text-center">{pendingWorkoutRoutine.name} ({pendingWorkoutRoutine.duration} min)</p>
            
            <div className="relative w-72 h-72 my-8">
                <svg className="w-full h-full" viewBox="0 0 280 280">
                    <circle className="text-spartan-surface" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="140" cy="140" />
                    <circle
                        className="text-spartan-gold"
                        strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="140" cy="140"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                        transform="rotate(-90 140 140)"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    {isFinished ? (
                        <BrainIcon className="w-24 h-24 text-spartan-gold animate-pulse" />
                    ) : (
                        <>
                           <span className="text-6xl font-mono">{countdown}</span>
                           <span className="text-lg text-spartan-text-secondary">segundos</span>
                        </>
                    )}
                </div>
            </div>

            <p className="text-xl italic text-spartan-text-secondary h-16 text-center max-w-lg">
                "{currentPrompt}"
            </p>

            <div className="mt-12 flex flex-col items-center gap-4 w-full max-w-xs">
                 <button
                    onClick={proceedToSession}
                    disabled={!isFinished}
                    className="w-full py-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg text-lg hover:bg-yellow-500 transition-colors disabled:bg-spartan-border disabled:cursor-not-allowed"
                >
                    Listo para el Foco
                </button>
                 <div className="flex gap-6">
                    <button
                        onClick={() => showModal('time-adjustment', { routine: pendingWorkoutRoutine })}
                        className="text-sm text-spartan-text-secondary hover:text-spartan-text flex items-center gap-1"
                    >
                        <ClockIcon className="w-4 h-4" /> Ajustar por tiempo
                    </button>
                    <button
                        onClick={() => showModal('skip-pre-workout-confirmation')}
                        className="text-sm text-spartan-text-secondary hover:text-spartan-text"
                    >
                        Omitir Activación
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreWorkoutFlow;
