import React from 'react';

interface ShieldIconProps {
    workouts?: number;
    streak?: number;
    className?: string;
}

const ShieldIcon: React.FC<ShieldIconProps> = ({ workouts = 0, streak = 0, className = 'w-48 h-48' }) => {

    // Determine shield material and shine based on streak
    let fill = '#CD7F32'; // Bronze
    let highlight = '#E5A454'; // Bronze highlight

    if (streak >= 7 && streak < 30) {
        fill = '#D4AF37'; // Polished Bronze/Spartan Gold
        highlight = '#F0C963';
    } else if (streak >= 30) {
        fill = '#FFD700'; // Gold
        highlight = '#FFF0A3';
    }

    const hasBorderEngraving = workouts >= 25;
    const hasCenterEmblem = workouts >= 100;

    return (
        <svg
            viewBox="0 0 200 200"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <radialGradient id="shieldGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" style={{ stopColor: highlight, stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: fill, stopOpacity: 1 }} />
                </radialGradient>
            </defs>

            {/* Main shield shape */}
            <path
                d="M100 10 C40 20, 20 80, 20 100 C20 150, 40 180, 100 190 C160 180, 180 150, 180 100 C180 80, 160 20, 100 10 Z"
                fill="url(#shieldGradient)"
                stroke="#1E1E1E"
                strokeWidth="5"
            />

            {/* Border */}
            <path
                d="M100 10 C40 20, 20 80, 20 100 C20 150, 40 180, 100 190 C160 180, 180 150, 180 100 C180 80, 160 20, 100 10 Z"
                fill="none"
                stroke="#333333"
                strokeWidth="10"
            />

            {/* Optional Border Engraving (Greek Key Pattern) */}
            {hasBorderEngraving && (
                <path
                    d="M40 50 H60 V70 H40 V90 H60 V110 H40 V130 H60 V150 H40 M160 50 H140 V70 H160 V90 H140 V110 H160 V130 H140 V150 H160 M70 40 H90 V60 H110 V40 H130 V60 H110 V80 H90 V60 H70 M70 160 H90 V140 H110 V160 H130 V140 H110 V120 H90 V140 H70"
                    fill="none"
                    stroke={highlight}
                    strokeWidth="2.5"
                    strokeOpacity="0.4"
                    className="animate-fadeIn"
                />
            )}

            {/* Optional Center Emblem (Spartan Lambda) */}
            {hasCenterEmblem && (
                <path
                    d="M80 60 L100 140 L120 60 M70 100 H130"
                    fill="none"
                    stroke={highlight}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.7"
                    className="animate-fadeIn"
                />
            )}

        </svg>
    );
};

export default ShieldIcon;

