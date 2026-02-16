import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useDevice } from '../context/DeviceContext.tsx';
import BackendApiService, { BioState } from '../services/api.ts';
import BrainIcon from './icons/BrainIcon.tsx';
// import ActivityIcon from './icons/ActivityIcon.tsx'; // Temporarily disabled - file missing
// import HeartIcon from './icons/HeartIcon.tsx'; // Temporarily disabled - file missing

interface CoachWidgetProps {
    synergisticLoadScore: number;
}

const CoachWidget: React.FC<CoachWidgetProps> = ({ synergisticLoadScore }) => {
    const { userProfile } = useAppContext();
    const { densityFactor } = useDevice();
    const [bioState, setBioState] = useState<BioState | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBioState = async () => {
            if (!userProfile?.id) return;
            setIsLoading(true);
            try {
                const state = await BackendApiService.getBioState(userProfile.id);
                setBioState(state);
            } catch (error) {
                console.error('Failed to fetch bio state', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBioState();
    }, [userProfile?.id]);

    // Calculate responsive styles based on density factor
    const padding = `${24 * densityFactor}px`;
    const borderRadius = `${8 * densityFactor}px`;
    const iconSize = `${24 * densityFactor}px`;
    const titleFontSize = `${20 * densityFactor}px`;
    const contentFontSize = `${16 * densityFactor}px`;

    return (
        <div
            className="bg-spartan-card rounded-lg shadow-md h-full flex flex-col"
            style={{ padding, borderRadius }}
        >
            <h3
                className="font-semibold text-spartan-gold mb-4 flex items-center gap-2"
                style={{ fontSize: titleFontSize }}
            >
                <BrainIcon className="w-6 h-6" style={{ width: iconSize, height: iconSize }} />
                El Porqué del Día
            </h3>
            {isLoading ? (
                <div className="flex-grow flex items-center justify-center">
                    <div className="flex items-center gap-1.5 h-5">
                        <span
                            className="bg-spartan-text-secondary rounded-full animate-pulse [animation-delay:0s]"
                            style={{ width: `${8 * densityFactor}px`, height: `${8 * densityFactor}px` }}
                        ></span>
                        <span
                            className="bg-spartan-text-secondary rounded-full animate-pulse [animation-delay:0.2s]"
                            style={{ width: `${8 * densityFactor}px`, height: `${8 * densityFactor}px` }}
                        ></span>
                        <span
                            className="bg-spartan-text-secondary rounded-full animate-pulse [animation-delay:0.4s]"
                            style={{ width: `${8 * densityFactor}px`, height: `${8 * densityFactor}px` }}
                        ></span>
                    </div>
                </div>
            ) : bioState ? (
                <div className="flex-grow flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-spartan-border/30">
                        <div className="flex items-center gap-2">
                            {/* <ActivityIcon className="text-spartan-gold w-4 h-4" /> */} {/* Temporarily disabled */}
                            <span className="text-xs uppercase tracking-wider text-spartan-text-secondary">Readiness</span>
                        </div>
                        <span className="text-xl font-bold text-spartan-gold">{bioState.readinessScore}%</span>
                    </div>

                    <div className="flex-grow">
                        <p
                            className="text-spartan-text italic leading-relaxed"
                            style={{ fontSize: contentFontSize }}
                        >
                            "{bioState.recommendations[0] || 'Escucha a tu cuerpo y mantén la disciplina.'}"
                        </p>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-spartan-border/20">
                        <div className="flex items-center gap-2">
                            {/* <HeartIcon className={`w-4 h-4 ${bioState.hrvStatus === 'optimal' ? 'text-green-500' : 'text-yellow-500'}`} /> */} {/* Temporarily disabled */}
                            <span className="text-xs text-spartan-text-secondary">HRV: {bioState.hrvStatus.toUpperCase()}</span>
                        </div>
                        <span className="text-[10px] text-spartan-text-secondary opacity-50">
                            Ref: {new Date(bioState.lastUpdate).toLocaleTimeString()}
                        </span>
                    </div>
                </div>
            ) : (
                <p className="text-spartan-text-secondary italic">No hay datos de biometría disponibles.</p>
            )}
        </div>
    );
};

export default CoachWidget;
