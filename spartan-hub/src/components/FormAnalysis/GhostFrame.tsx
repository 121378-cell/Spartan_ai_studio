import React from 'react';

interface GhostFrameProps {
    imageUrl: string;
    opacity?: number;
    isVisible: boolean;
}

const GhostFrame: React.FC<GhostFrameProps> = ({ imageUrl, opacity = 0.3, isVisible }) => {
    if (!isVisible) return null;

    return (
        <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500 flex items-center justify-center"
            style={{ opacity }}
        >
            <img
                src={imageUrl}
                alt="Guide Frame"
                className="w-full h-full object-contain filter invert opacity-50 contrast-125"
                onError={(e) => {
                    // Hide if image fails to load
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />

            <div className="absolute inset-0 border-4 border-spartan-gold/20 rounded-2xl animate-pulse" />

            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-spartan-gold/30">
                <span className="text-xs font-bold text-spartan-gold uppercase tracking-widest whitespace-nowrap">
                    Alínea tu cuerpo con la guía
                </span>
            </div>
        </div>
    );
};

export default GhostFrame;
