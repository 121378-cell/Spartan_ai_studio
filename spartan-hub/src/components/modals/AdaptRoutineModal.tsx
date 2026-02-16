import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import type { Routine } from '../../types.ts';
import { adaptRoutine } from '../../services/aiService.ts';
import LoadingSpinner from '../LoadingSpinner.tsx';
import SwapIcon from '../icons/SwapIcon.tsx';
import ZapIcon from '../icons/ZapIcon.tsx';
import LotusIcon from '../icons/LotusIcon.tsx';

interface AdaptRoutineModalProps {
    routine: Routine;
}

type AdaptationContext = 'bodyweight_only' | 'resistance_focus' | 'mental_recovery';

const AdaptationOptionCard: React.FC<{ icon: React.ReactNode; title: string; description: string; onClick: () => void; }> = ({ icon, title, description, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center text-left bg-spartan-card p-4 rounded-lg hover:bg-spartan-border transition-colors"
    >
        <div className="w-12 h-12 bg-spartan-surface rounded-lg flex items-center justify-center text-spartan-gold flex-shrink-0 mr-4">
            {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-8 h-8' })}
        </div>
        <div>
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-sm text-spartan-text-secondary">{description}</p>
        </div>
    </button>
);


const AdaptRoutineModal: React.FC<AdaptRoutineModalProps> = ({ routine }) => {
    const { hideModal, addRoutine, startWorkout, showToast } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [adaptedRoutine, setAdaptedRoutine] = useState<Omit<Routine, 'id'> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAdapt = async (context: AdaptationContext) => {
        setIsLoading(true);
        setError(null);
        setAdaptedRoutine(null);
        const result = await adaptRoutine(routine, context);
        setIsLoading(false);
        if (result) {
            setAdaptedRoutine(result);
        } else {
            setError("La IA no pudo adaptar la rutina. Por favor, inténtalo de nuevo.");
            showToast("Error al adaptar la rutina.");
        }
    };

    const handleStartWorkout = () => {
        if (adaptedRoutine) {
            const routineToStart: Routine = { ...adaptedRoutine, id: `adapted-${Date.now()}` };
            startWorkout(routineToStart);
            hideModal();
        }
    };

    const handleSaveRoutine = () => {
        if (adaptedRoutine) {
            addRoutine(adaptedRoutine);
            showToast("Rutina adaptada guardada.");
            hideModal();
        }
    };

    const renderInitialOptions = () => (
        <div className="space-y-4">
            <AdaptationOptionCard
                icon={<SwapIcon />}
                title="Adaptar para Peso Corporal"
                description="Traduce la rutina a una versión sin equipamiento."
                onClick={() => handleAdapt('bodyweight_only')}
            />
            <AdaptationOptionCard
                icon={<ZapIcon />}
                title="Convertir a Resistencia (HIIT)"
                description="Convierte la sesión en un circuito metabólico de alta intensidad."
                onClick={() => handleAdapt('resistance_focus')}
            />
            <AdaptationOptionCard
                icon={<LotusIcon />}
                title="Sustituir por Recuperación Mental"
                description="Reemplaza el entrenamiento con una sesión restaurativa de movilidad y respiración."
                onClick={() => handleAdapt('mental_recovery')}
            />
        </div>
    );

    const renderAdaptedPreview = () => (
        adaptedRoutine && (
            <div className="mt-6 animate-fadeIn">
                <h3 className="text-xl font-bold text-spartan-gold mb-2">Vista Previa de la Rutina Adaptada</h3>
                <div className="bg-spartan-card p-4 rounded-lg max-h-64 overflow-y-auto">
                    <h4 className="text-lg font-bold">{adaptedRoutine.name}</h4>
                    <p className="text-sm uppercase text-spartan-text-secondary mb-3">{adaptedRoutine.focus} • {adaptedRoutine.duration} MINS</p>
                    <ul className="space-y-3">
                        {adaptedRoutine.blocks.map((block, blockIndex) => (
                            <li key={blockIndex}>
                                <p className="text-sm font-bold text-spartan-text-secondary uppercase tracking-wider">{block.name}</p>
                                <ul className="pl-2 mt-1 space-y-2 border-l-2 border-spartan-border">
                                    {block.exercises.map((ex, exIndex) => (
                                        <li key={exIndex} className="text-sm">
                                            <div className="flex justify-between">
                                                <span>{ex.name}</span>
                                                <span className="font-mono text-spartan-text-secondary">{`${ex.sets}x${ex.reps}`}</span>
                                            </div>
                                            {ex.coachTip && <p className="text-xs italic text-spartan-gold/80 pl-2">→ {ex.coachTip}</p>}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        )
    );

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-2">Motor de Disciplinas</h2>
            <p className="text-spartan-text-secondary mb-6">Adapta '{routine.name}' a tus circunstancias actuales.</p>

            {!adaptedRoutine && !isLoading && renderInitialOptions()}

            {isLoading && <LoadingSpinner />}
            {error && <p className="text-red-500 text-center">{error}</p>}
            {adaptedRoutine && renderAdaptedPreview()}

            <div className="flex justify-end gap-4 mt-8">
                <button
                    onClick={hideModal}
                    className="py-2 px-4 bg-spartan-surface hover:bg-spartan-border rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                {adaptedRoutine && (
                    <>
                        <button
                            onClick={handleSaveRoutine}
                            className="py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors"
                        >
                            Guardar como Nueva
                        </button>
                        <button
                            onClick={handleStartWorkout}
                            className="py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                        >
                            Empezar Entrenamiento
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdaptRoutineModal;

