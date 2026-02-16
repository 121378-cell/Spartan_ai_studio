import React from 'react';

interface SynergisticLoadDialProps {
  score: number;
  size?: number; // Optional size parameter for responsive scaling
}

const SynergisticLoadDial: React.FC<SynergisticLoadDialProps> = ({ score, size = 208 }) => {
    const radius = size * 0.385; // Approximately 80 for size 208
    const strokeWidth = size * 0.072; // Approximately 15 for size 208
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let colorClass = 'text-red-500'; // 0-49: Riesgo/Priorizar Recuperación
    if (score >= 80) {
        colorClass = 'text-green-500'; // 80-100: Máximo Rendimiento
    } else if (score >= 50) {
        colorClass = 'text-yellow-500'; // 50-79: Precaución/Moderar
    }

    // Calculate responsive text sizes
    const scoreFontSize = size * 0.29; // Approximately 60px for size 208
    const labelFontSize = size * 0.048; // Approximately 10px for size 208

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="w-full h-full" viewBox="0 0 200 200">
                <circle
                    className="text-spartan-surface"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="100"
                    cy="100"
                />
                <circle
                    className={colorClass}
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="100"
                    cy="100"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                    transform="rotate(-90 100 100)"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-bold ${colorClass}`} style={{ fontSize: `${scoreFontSize}px` }}>{score}</span>
                <span className="text-spartan-text-secondary uppercase tracking-widest" style={{ fontSize: `${labelFontSize}px` }}>Carga</span>
            </div>
        </div>
    );
};

export default SynergisticLoadDial;
