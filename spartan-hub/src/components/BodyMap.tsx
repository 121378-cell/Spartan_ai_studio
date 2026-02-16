import React, { useState } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import type { BodyPart } from '../types.ts';

interface BodyMapProps {
    selectedParts: string[];
    onPartSelect: (part: string) => void;
    multiple?: boolean;
}

const BodyPartPath: React.FC<{
    partName: string;
    d: string;
    isSelected: boolean;
    onClick: (part: string) => void;
}> = ({ partName, d, isSelected, onClick }) => (
    <path
        d={d}
        data-part={partName}
        onClick={() => onClick(partName)}
        className={`cursor-pointer transition-all duration-200 ${
            isSelected 
                ? 'fill-spartan-gold opacity-80' 
                : 'fill-spartan-border opacity-50 hover:opacity-75 hover:fill-spartan-text-secondary'
        }`}
    />
);

const BodyMap: React.FC<BodyMapProps> = ({ selectedParts, onPartSelect, multiple = true }) => {
    const { isMobile, isTablet, densityFactor } = useDevice();
    const [view, setView] = useState<'front' | 'back'>('front');

    const handlePartClick = (part: string) => {
        if (!multiple) {
            onPartSelect(part);
            return;
        }
        onPartSelect(part); // Parent component will handle logic for adding/removing
    };
    
    const isSelected = (part: string) => selectedParts.includes(part);

    // Adjust button sizing based on device
    const buttonSize = isMobile ? 'text-xs px-3 py-1' : isTablet ? 'text-sm px-3 py-1' : 'text-sm px-4 py-1';

    // Calculate max height based on device type with more conservative values
    const getMaxHeightClass = () => {
        if (isMobile) return 'max-h-[300px]';
        if (isTablet) return 'max-h-[350px]';
        return 'max-h-[400px]';
    };

    return (
        <div className="bg-spartan-card p-4 rounded-lg">
            <div className="flex justify-center gap-4 mb-2">
                <button 
                    onClick={() => setView('front')} 
                    className={`${buttonSize} rounded-full font-semibold transition-colors ${
                        view === 'front' 
                            ? 'bg-spartan-gold text-spartan-bg' 
                            : 'bg-spartan-surface hover:bg-spartan-border'
                    }`}
                >
                    Frontal
                </button>
                <button 
                    onClick={() => setView('back')} 
                    className={`${buttonSize} rounded-full font-semibold transition-colors ${
                        view === 'back' 
                            ? 'bg-spartan-gold text-spartan-bg' 
                            : 'bg-spartan-surface hover:bg-spartan-border'
                    }`}
                >
                    Trasera
                </button>
            </div>
            {/* Responsive SVG with better sizing for different screens */}
            <div className={`flex justify-center overflow-hidden ${getMaxHeightClass()}`}>
                <svg 
                    viewBox="0 0 200 400" 
                    className="w-full h-full max-w-full mx-auto"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <g visibility={view === 'front' ? 'visible' : 'hidden'}>
                        {/* Head */}
                        <BodyPartPath partName="Cuello" d="M92 60 a8,8 0 1,1 16,0 v15 h-16 Z" isSelected={isSelected('Cuello')} onClick={handlePartClick} />
                        {/* Shoulders */}
                        <BodyPartPath partName="Hombro" d="M70 75 a15,15 0 0,1 22,-10 v25 l-22,5 Z" isSelected={isSelected('Hombro')} onClick={handlePartClick} />
                        <BodyPartPath partName="Hombro" d="M130 75 a15,15 0 0,0 -22,-10 v25 l22,5 Z" isSelected={isSelected('Hombro')} onClick={handlePartClick} />
                        {/* Torso */}
                        <BodyPartPath partName="Torso" d="M80 95 h40 v60 h-40 Z" isSelected={isSelected('Torso')} onClick={handlePartClick} />
                        {/* Elbows */}
                        <BodyPartPath partName="Codo" d="M60 120 l-10 40 h10 l10 -40 Z" isSelected={isSelected('Codo')} onClick={handlePartClick} />
                        <BodyPartPath partName="Codo" d="M140 120 l10 40 h-10 l-10 -40 Z" isSelected={isSelected('Codo')} onClick={handlePartClick} />
                        {/* Wrists */}
                        <BodyPartPath partName="Muñeca" d="M45 180 l-5 20 h10 l5 -20 Z" isSelected={isSelected('Muñeca')} onClick={handlePartClick} />
                        <BodyPartPath partName="Muñeca" d="M155 180 l5 20 h-10 l-5 -20 Z" isSelected={isSelected('Muñeca')} onClick={handlePartClick} />
                        {/* Hips */}
                        <BodyPartPath partName="Cadera" d="M80 155 h-15 l-5 25 h20 Z" isSelected={isSelected('Cadera')} onClick={handlePartClick} />
                        <BodyPartPath partName="Cadera" d="M120 155 h15 l5 25 h-20 Z" isSelected={isSelected('Cadera')} onClick={handlePartClick} />
                        {/* Knees */}
                        <BodyPartPath partName="Rodilla" d="M75 250 l-5 40 h20 l-5 -40 Z" isSelected={isSelected('Rodilla')} onClick={handlePartClick} />
                        <BodyPartPath partName="Rodilla" d="M125 250 l5 40 h-20 l5 -40 Z" isSelected={isSelected('Rodilla')} onClick={handlePartClick} />
                         {/* Ankles */}
                        <BodyPartPath partName="Tobillo" d="M70 350 l-5 25 h20 l-5 -25 Z" isSelected={isSelected('Tobillo')} onClick={handlePartClick} />
                        <BodyPartPath partName="Tobillo" d="M130 350 l5 25 h-20 l5 -25 Z" isSelected={isSelected('Tobillo')} onClick={handlePartClick} />
                    </g>
                     <g visibility={view === 'back' ? 'visible' : 'hidden'}>
                        {/* Base body */}
                        <path d="M90,60 a10,10 0 1,1 20,0 v15 a20,10 0 0,0 -20,0 Z M80,80 l-20,120 h20 v150 l-10,40 h20 l-5,-40 v-150 h40 v150 l-5,40 h20 l-10,-40 v-150 h20 l-20,-120 Z" fill="#2A2A2A" />
                        {/* Head */}
                        <BodyPartPath partName="Cuello" d="M92 60 a8,8 0 1,1 16,0 v15 h-16 Z" isSelected={isSelected('Cuello')} onClick={handlePartClick} />
                        {/* Shoulders */}
                        <BodyPartPath partName="Hombro" d="M70 75 a15,15 0 0,1 22,-10 v25 l-22,5 Z" isSelected={isSelected('Hombro')} onClick={handlePartClick} />
                        <BodyPartPath partName="Hombro" d="M130 75 a15,15 0 0,0 -22,-10 v25 l22,5 Z" isSelected={isSelected('Hombro')} onClick={handlePartClick} />
                        {/* Upper Back */}
                        <BodyPartPath partName="Torso" d="M80 95 h40 v30 h-40 Z" isSelected={isSelected('Torso')} onClick={handlePartClick} />
                        {/* Lower Back */}
                        <BodyPartPath partName="Espalda Baja" d="M85 125 h30 v30 h-30 Z" isSelected={isSelected('Espalda Baja')} onClick={handlePartClick} />
                        {/* Elbows */}
                        <BodyPartPath partName="Codo" d="M60 120 l-10 40 h10 l10 -40 Z" isSelected={isSelected('Codo')} onClick={handlePartClick} />
                        <BodyPartPath partName="Codo" d="M140 120 l10 40 h-10 l-10 -40 Z" isSelected={isSelected('Codo')} onClick={handlePartClick} />
                        {/* Wrists */}
                        <BodyPartPath partName="Muñeca" d="M45 180 l-5 20 h10 l5 -20 Z" isSelected={isSelected('Muñeca')} onClick={handlePartClick} />
                        <BodyPartPath partName="Muñeca" d="M155 180 l5 20 h-10 l-5 -20 Z" isSelected={isSelected('Muñeca')} onClick={handlePartClick} />
                        {/* Hips/Glutes */}
                        <BodyPartPath partName="Cadera" d="M80 155 h-15 l-5 25 h20 Z" isSelected={isSelected('Cadera')} onClick={handlePartClick} />
                        <BodyPartPath partName="Cadera" d="M120 155 h15 l5 25 h-20 Z" isSelected={isSelected('Cadera')} onClick={handlePartClick} />
                        {/* Knees */}
                        <BodyPartPath partName="Rodilla" d="M75 250 l-5 40 h20 l-5 -40 Z" isSelected={isSelected('Rodilla')} onClick={handlePartClick} />
                        <BodyPartPath partName="Rodilla" d="M125 250 l5 40 h-20 l5 -40 Z" isSelected={isSelected('Rodilla')} onClick={handlePartClick} />
                         {/* Ankles */}
                        <BodyPartPath partName="Tobillo" d="M70 350 l-5 25 h20 l-5 -25 Z" isSelected={isSelected('Tobillo')} onClick={handlePartClick} />
                        <BodyPartPath partName="Tobillo" d="M130 350 l5 25 h-20 l5 -25 Z" isSelected={isSelected('Tobillo')} onClick={handlePartClick} />
                    </g>
                </svg>
            </div>
        </div>
    );
};

export default BodyMap;
