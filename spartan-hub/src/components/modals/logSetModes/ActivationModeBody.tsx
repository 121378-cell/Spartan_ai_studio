import React from 'react';
import { useDevice } from '../../../context/DeviceContext.tsx';
import type { SetProgress } from '../../../types.ts';
import FocusIcon from '../../icons/FocusIcon.tsx';
import CheckIcon from '../../icons/CheckIcon.tsx';
import DistractedIcon from '../../icons/DistractedIcon.tsx';

interface ActivationModeBodyProps {
    quality: SetProgress['quality'];
    setQuality: (value: SetProgress['quality']) => void;
}

const QualityButton: React.FC<{
    label: string;
    value: SetProgress['quality'];
    icon: React.ReactNode;
    currentValue: SetProgress['quality'];
    onClick: (value: SetProgress['quality']) => void;
    isMobile: boolean;
    densityFactor: number;
}> = ({ label, value, icon, currentValue, onClick, isMobile, densityFactor }) => {
    const isSelected = currentValue === value;

    // Calculate responsive styles based on density factor
    const padding = `${16 * densityFactor}px`;
    const gap = `${8 * densityFactor}px`;
    const iconSize = `${32 * densityFactor}px`;
    const fontSize = `${14 * densityFactor}px`;

    return (
        <button
            type="button"
            onClick={() => onClick(value)}
            className={`flex flex-col items-center justify-center rounded-lg border-2 transition-all transform hover:scale-105 ${isSelected ? 'bg-spartan-gold text-spartan-bg border-spartan-gold' : 'bg-spartan-card border-spartan-border'
                } ${isMobile ? 'flex-1' : ''}`}
            style={{
                padding,
                gap,
                minWidth: isMobile ? 'auto' : `${120 * densityFactor}px`
            }}
        >
            {React.cloneElement(icon as React.ReactElement<any>, {
                className: 'w-8 h-8',
                style: { width: iconSize, height: iconSize }
            })}
            <span
                className="font-semibold"
                style={{ fontSize }}
            >
                {label}
            </span>
        </button>
    );
};

const ActivationModeBody: React.FC<ActivationModeBodyProps> = ({ quality, setQuality }) => {
    const { isMobile, densityFactor } = useDevice();

    // Calculate responsive styles based on density factor
    const containerPadding = `${24 * densityFactor}px`;
    const fieldSpacing = `${16 * densityFactor}px`;
    const labelFontSize = `${16 * densityFactor}px`;
    const descriptionFontSize = `${12 * densityFactor}px`;
    const descriptionMarginTop = `${16 * densityFactor}px`;

    return (
        <div
            className={`min-h-[350px] flex flex-col items-center justify-center ${isMobile ? 'gap-4' : 'gap-4'}`}
            style={{ padding: containerPadding }}
        >
            <p
                className="text-spartan-text-secondary mb-4 text-center"
                style={{ fontSize: labelFontSize, marginBottom: fieldSpacing }}
            >
                Evalúa la calidad y el foco de tu ejecución:
            </p>
            <div className={`w-full ${isMobile ? 'flex flex-col gap-4' : 'flex justify-center gap-4'}`}>
                <QualityButton
                    label="Máximo Foco"
                    value="max_focus"
                    icon={<FocusIcon />}
                    currentValue={quality}
                    onClick={setQuality}
                    isMobile={isMobile}
                    densityFactor={densityFactor}
                />
                <QualityButton
                    label="Aceptable"
                    value="acceptable"
                    icon={<CheckIcon />}
                    currentValue={quality}
                    onClick={setQuality}
                    isMobile={isMobile}
                    densityFactor={densityFactor}
                />
                <QualityButton
                    label="Distraído"
                    value="distracted"
                    icon={<DistractedIcon />}
                    currentValue={quality}
                    onClick={setQuality}
                    isMobile={isMobile}
                    densityFactor={densityFactor}
                />
            </div>
            <p
                className="text-spartan-text-secondary text-center"
                style={{ fontSize: descriptionFontSize, marginTop: descriptionMarginTop }}
            >
                Tu feedback informa a la IA para ajustar futuros calentamientos y focos biomecánicos.
            </p>
        </div>
    );
};

export default ActivationModeBody;
