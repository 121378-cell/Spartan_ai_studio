import React, { useState, useEffect } from 'react';
import LotusIcon from './icons/LotusIcon.tsx';

interface CooldownProtocolProps {
    onComplete: () => void;
    onSkip: () => void;
}

const COOLDOWN_DURATION = 90; // seconds

const CooldownProtocol: React.FC<CooldownProtocolProps> = ({ onComplete, onSkip }) => {
    const [timeLeft, setTimeLeft] = useState(COOLDOWN_DURATION);
    const [prompt, setPrompt] = useState('Prepárate...');

    useEffect(() => {
        if (timeLeft <= 0) {
            onComplete();
            return;
        }

        const cycleTime = 10; // 4s in, 2s hold, 4s out
        const timeInCycle = (COOLDOWN_DURATION - timeLeft) % cycleTime;

        if (timeInCycle < 4) {
            setPrompt('Inhala lentamente...');
        } else if (timeInCycle < 6) {
            setPrompt('Sostén...');
        } else {
            setPrompt('Exhala suavemente...');
        }

        const intervalId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [timeLeft, onComplete]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-spartan-bg z-50 flex flex-col items-center justify-center p-4 animate-fadeIn">
            <LotusIcon className="w-16 h-16 text-spartan-gold mb-6"/>
            <h1 className="text-3xl font-bold">Protocolo de Enfriamiento</h1>
            <p className="text-spartan-text-secondary mb-8">Baja el cortisol y comienza tu recuperación.</p>
            
            <div className="relative w-72 h-72 my-8">
                <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-full h-full bg-spartan-surface rounded-full animate-pulse-slow"></div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-6xl font-mono">{formatTime(timeLeft)}</span>
                    <p className="text-xl italic text-spartan-text-secondary mt-2">{prompt}</p>
                </div>
            </div>

            <button onClick={onSkip} className="mt-12 text-sm text-spartan-text-secondary hover:text-spartan-text">
                Omitir Enfriamiento
            </button>
        </div>
    );
};

export default CooldownProtocol;

