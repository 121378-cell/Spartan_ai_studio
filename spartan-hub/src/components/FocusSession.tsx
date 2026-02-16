import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { logger } from '../utils/logger';
import { playFocusTone, stopFocusTone } from '../services/audioService';
import StateTransitionGuide from './StateTransitionGuide';

const DEEP_WORK_SECONDS = 45 * 60;

type SessionState = 'focus' | 'transition';

const FocusSession: React.FC = () => {
    const { endFocusSession } = useAppContext();
    const [sessionState, setSessionState] = useState<SessionState>('focus');
    const [timeLeft, setTimeLeft] = useState(DEEP_WORK_SECONDS);

    // Fullscreen and Audio management
    useEffect(() => {
        const enterFullscreen = async () => {
            try {
                await document.documentElement.requestFullscreen();
            } catch (err) {
                logger.error('Error attempting to enable full-screen mode', { metadata: { error: (err as Error).message } });
            }
        };
        enterFullscreen();
        playFocusTone();

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                endFocusSession();
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            stopFocusTone();
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [endFocusSession]);

    // Main timer logic
    useEffect(() => {
        if (sessionState !== 'focus') return;

        if (timeLeft <= 0) {
            setSessionState('transition');
            return;
        }

        const intervalId = setInterval(() => {
            setTimeLeft(t => t - 1);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [sessionState, timeLeft]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (sessionState === 'transition') {
        return (
            <div className="fixed inset-0 bg-spartan-bg z-[100] flex flex-col items-center justify-center p-4">
                <StateTransitionGuide onComplete={endFocusSession} />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-spartan-bg z-[100] flex flex-col items-center justify-center p-4 animate-fadeIn">
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border border-spartan-border animate-pulse-slow"></div>
            </div>
             <div className="absolute bottom-8 right-8 text-spartan-text-secondary font-mono text-4xl bg-spartan-bg/50 px-3 py-1 rounded">
                {formatTime(timeLeft)}
            </div>
            <button
                onClick={endFocusSession}
                className="absolute top-8 right-8 text-spartan-text-secondary bg-spartan-surface/80 px-4 py-2 rounded-full hover:bg-spartan-border hover:text-spartan-text transition-colors"
            >
                Finalizar Sesión
            </button>
        </div>
    );
};

export default FocusSession;

