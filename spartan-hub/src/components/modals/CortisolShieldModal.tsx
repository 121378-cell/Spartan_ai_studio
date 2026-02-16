import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import type { Routine } from '../../types.ts';
import { adaptRoutine } from '../../services/aiService.ts';
import LoadingSpinner from '../LoadingSpinner.tsx';
import HormoneIcon from '../icons/HormoneIcon.tsx';

interface CortisolShieldModalProps {
    routine: Routine;
    hoursBeforeBed: string;
}

const CortisolShieldModal: React.FC<CortisolShieldModalProps> = ({ routine, hoursBeforeBed }) => {
    const { hideModal, startWorkout, showToast } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);

    const handleAdapt = async () => {
        setIsLoading(true);
        const adapted = await adaptRoutine(routine, 'mental_recovery');
        setIsLoading(false);
        if (adapted) {
            const adaptedWithId: Routine = { ...adapted, id: `adapted-${Date.now()}` };
            startWorkout(adaptedWithId, true); // Bypass check this time
            hideModal();
            showToast("Protocolo de Recuperación iniciado.");
        } else {
            showToast("Error al adaptar la rutina.");
        }
    };

    const handleProceed = () => {
        startWorkout(routine, true); // Bypass check
        hideModal();
    };

    return (
        <div>
            <div className="text-center">
                 <div className="w-20 h-20 bg-spartan-surface rounded-full flex items-center justify-center mx-auto mb-4 text-spartan-gold">
                    <HormoneIcon className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold text-spartan-gold mb-2">Alerta de Optimización Hormonal</h2>
                <p className="text-spartan-text-secondary mb-6">
                    Estás a punto de iniciar un entrenamiento de alta intensidad a solo <strong>{hoursBeforeBed} horas</strong> de tu hora de dormir objetivo.
                </p>
            </div>

            <div className="bg-spartan-card p-4 rounded-lg text-left mb-6">
                <p className="font-semibold">Impacto Bioquímico:</p>
                <p className="text-sm text-spartan-text-secondary">El entrenamiento HIIT en este horario puede elevar el cortisol, lo que podría interferir con la calidad de tu sueño y reducir la producción nocturna de testosterona y hormona del crecimiento, claves para la recuperación.</p>
            </div>

            {isLoading && <LoadingSpinner />}

            {!isLoading && (
                 <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
                    <button
                        onClick={handleProceed}
                        className="py-2 px-6 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors"
                    >
                        Entrenar de Todos Modos
                    </button>
                    <button
                        onClick={handleAdapt}
                        className="py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                        Adaptar a Baja Intensidad
                    </button>
                </div>
            )}
        </div>
    );
};

export default CortisolShieldModal;
