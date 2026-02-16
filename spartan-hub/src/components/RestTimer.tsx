import React, { useState, useEffect } from 'react';
import AlertTriangleIcon from './icons/AlertTriangleIcon.tsx';

interface RestTimerProps {
  duration: number; // in seconds
  onComplete: () => void;
  timerKey: string; // Add a key to force re-render
  synergisticLoadScore: number;
  onReportDiscomfort: () => void;
}

const RestTimer: React.FC<RestTimerProps> = ({ duration, onComplete, timerKey, synergisticLoadScore, onReportDiscomfort }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [currentDuration, setCurrentDuration] = useState(duration);
  
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timeLeft / currentDuration) * circumference;

  useEffect(() => {
    setTimeLeft(duration); // Reset timer when key changes
    setCurrentDuration(duration);
  }, [timerKey, duration]);

  useEffect(() => {
    if (timeLeft <= 0) {
      // Play sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext) {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.5);
      }

      // Vibrate
      if ('vibrate' in navigator) {
          navigator.vibrate(500); // Vibrate for 500ms
      }
      
      onComplete();
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, onComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleExtendRest = () => {
    setTimeLeft(prev => prev + 30);
    setCurrentDuration(prev => prev + 30);
  };

  const handleReportDiscomfort = () => {
    onComplete(); // This will unmount the timer
    onReportDiscomfort();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4 bg-spartan-surface rounded-lg">
      <p className="text-lg font-bold text-spartan-gold">DESCANSO</p>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          <circle
            className="text-spartan-border"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="60"
            cy="60"
          />
          <circle
            className="text-spartan-gold"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="60"
            cy="60"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-mono">
            {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </span>
        </div>
      </div>
       <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={onComplete}
            className="w-full text-sm bg-spartan-card hover:bg-spartan-border px-4 py-2 rounded-full transition-colors font-semibold"
          >
            Saltar Descanso
          </button>
           {synergisticLoadScore < 50 && (
              <button 
                onClick={handleExtendRest}
                className="w-full text-sm bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 px-4 py-2 rounded-full transition-colors font-semibold"
              >
                Extender Descanso (+30s)
              </button>
          )}
          <button 
            onClick={handleReportDiscomfort}
            className="w-full flex items-center justify-center gap-2 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/40 px-4 py-2 rounded-full transition-colors font-semibold"
          >
            <AlertTriangleIcon className="w-4 h-4" />
            Reportar Molestia
          </button>
      </div>
    </div>
  );
};

export default RestTimer;
