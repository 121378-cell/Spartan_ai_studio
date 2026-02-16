import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import { adaptRoutine } from '../../services/aiService.ts';
import OracleIcon from '../icons/OracleIcon.tsx';
import LotusIcon from '../icons/LotusIcon.tsx';
import BrainIcon from '../icons/BrainIcon.tsx';
import LoadingSpinner from '../LoadingSpinner.tsx';
import type { Routine } from '../../types.ts';

const PropheticInterventionModal: React.FC = () => {
    const { hideModal, modal, routines, startWorkout, showToast, addRoutine } = useAppContext();
    const { reason } = modal.payload || {};
    const [isLoading, setIsLoading] = useState(false);

    const todayWorkout = routines.length > 0 ? routines[0] : null;

    const handleRecoveryProtocol = async () => {
        if (!todayWorkout) {
            showToast("No hay rutinas para adaptar.");
            hideModal();
            return;
        }
        setIsLoading(true);
        const recoveryRoutine = await adaptRoutine(todayWorkout, 'mental_recovery');
        setIsLoading(false);
        if (recoveryRoutine) {
            const routineWithId: Routine = { ...recoveryRoutine, id: `adapted-${Date.now()}` };
            startWorkout(routineWithId, true);
            hideModal();
        } else {
            showToast("No se pudo generar el protocolo de recuperación.");
        }
    };
    
    const handleAddAndStartRecovery = async () => {
         if (!todayWorkout) {
            showToast("No hay rutinas para adaptar.");
            hideModal();
            return;
        }
        setIsLoading(true);
        const recoveryRoutine = await adaptRoutine(todayWorkout, 'mental_recovery');
        setIsLoading(false);
        if (recoveryRoutine) {
            addRoutine(recoveryRoutine);
            showToast("Protocolo de recuperación guardado en tus rutinas.");
            hideModal();
        } else {
            showToast("No se pudo generar el protocolo de recuperación.");
        }
    }


    return (
        <div>
            <div className="text-center mb-6">
                <div className="w-20 h-20 bg-spartan-surface rounded-full flex items-center justify-center mx-auto mb-4 text-spartan-gold">
                    <OracleIcon className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold text-spartan-gold">Intervención Profética</h2>
                <p className="text-spartan-text-secondary mt-2">{reason}</p>
            </div>

            {isLoading ? <LoadingSpinner /> : (
                <div className="space-y-4">
                     <p className="text-center text-lg">El Oráculo aconseja una de estas acciones para restaurar tu equilibrio:</p>
                    <button
                        onClick={handleRecoveryProtocol}
                        disabled={!todayWorkout}
                        className="w-full flex items-center text-left p-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors disabled:opacity-50"
                    >
                        <LotusIcon className="w-8 h-8 text-spartan-gold mr-4 flex-shrink-0" />
                        <div>
                            <h3 className="font-bold">Iniciar Protocolo de Recuperación Ahora</h3>
                            <p className="text-sm text-spartan-text-secondary">Sustituye tu entrenamiento de hoy por una sesión de movilidad y respiración.</p>
                        </div>
                    </button>
                    
                    <button
                        onClick={handleAddAndStartRecovery}
                        disabled={!todayWorkout}
                        className="w-full flex items-center text-left p-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors disabled:opacity-50"
                    >
                        <BrainIcon className="w-8 h-8 text-spartan-gold mr-4 flex-shrink-0" />
                        <div>
                            <h3 className="font-bold">Añadir Protocolo a mis Rutinas</h3>
                            <p className="text-sm text-spartan-text-secondary">Guarda una sesión de recuperación para usarla cuando la necesites.</p>
                        </div>
                    </button>
                </div>
            )}
            
            <div className="flex justify-end mt-8">
                <button onClick={hideModal} className="py-2 px-6 bg-spartan-surface hover:bg-spartan-border rounded-lg">
                    Ignorar
                </button>
            </div>
        </div>
    );
};

export default PropheticInterventionModal;

