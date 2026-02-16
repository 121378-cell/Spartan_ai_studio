import React, { useState, useEffect } from 'react';
import LotusIcon from './icons/LotusIcon';

const TRANSITION_DURATION = 60; // seconds

interface StateTransitionGuideProps {
    onComplete: () => void;
}

const prompts = [
    { text: "Mueve los ojos lentamente de izquierda a derecha.", startTime: 0 },
    { text: "Ahora, de arriba hacia abajo.", startTime: 15 },
    { text: "Gira la cabeza suavemente hacia tu hombro izquierdo.", startTime: 30 },
    { text: "Cambia y gira hacia la derecha.", startTime: 45 },
    { text: "Vuelve al centro y respira profundamente.", startTime: 55 }
];

const StateTransitionGuide: React.FC<StateTransitionGuideProps> = ({ onComplete }) => {
    const [timeLeft, setTimeLeft] = useState(TRANSITION_DURATION);
    const [currentPrompt, setCurrentPrompt] = useState(prompts[0].text);

    useEffect(() => {
        if (timeLeft <= 0) {
            onComplete();
            return;
        }

        const elapsed = TRANSITION_DURATION - timeLeft;
        const activePrompt = [...prompts].reverse().find(p => elapsed >= p.startTime);
        if (activePrompt) {
            setCurrentPrompt(activePrompt.text);
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, onComplete]);

    const progressPercentage = (timeLeft / TRANSITION_DURATION) * 100;

    return (
        <div className="text-center animate-fadeIn max-w-lg">
            <h2 className="text-3xl font-bold text-spartan-gold mb-4">Bloque de Foco Finalizado</h2>
            <p className="text-xl text-spartan-text-secondary mb-8">
                Toma 60 segundos para una transición de estado.
            </p>
            <div className="bg-spartan-surface p-8 rounded-lg">
                <div className="flex justify-center items-center gap-4 mb-4">
                    <LotusIcon className="w-8 h-8 text-spartan-gold"/>
                    <p className="text-2xl font-semibold italic">{currentPrompt}</p>
                </div>
                <div className="w-full bg-spartan-border rounded-full h-2.5">
                    <div
                        className="bg-spartan-gold h-2.5 rounded-full"
                        style={{ width: `${progressPercentage}%`, transition: 'width 1s linear' }}
                    ></div>
                </div>
                 <p className="text-4xl font-mono mt-4">{timeLeft}</p>
            </div>
        </div>
    );
};

export default StateTransitionGuide;
