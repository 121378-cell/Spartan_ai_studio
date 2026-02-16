import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import type { Routine } from '../../types.ts';
import LoadingSpinner from '../LoadingSpinner.tsx';

interface TimeAdjustmentModalProps {
    routine: Routine;
}

const TimeAdjustmentModal: React.FC<TimeAdjustmentModalProps> = ({ routine }) => {
    const { hideModal, adjustPendingWorkout } = useAppContext();
    const [availableTime, setAvailableTime] = useState(Math.floor(routine.duration / 2));
    const [isLoading, setIsLoading] = useState(false);

    const handleAdjust = async () => {
        setIsLoading(true);
        await adjustPendingWorkout(routine, availableTime);
        // On success, the modal will be hidden by the context function.
        // On error, we want to stop loading to allow the user to retry.
        setIsLoading(false);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">Ajuste de la Palanca</h2>
            <p className="text-spartan-text-secondary mb-6">
                ¿Cuánto tiempo tienes para la sesión de '{routine.name}'? El coach preservará el estímulo.
            </p>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[150px]">
                    <LoadingSpinner />
                    <p className="mt-4 text-spartan-text-secondary">Ajustando plan...</p>
                </div>
            ) : (
                <div className="space-y-4 text-center">
                    <div>
                        <label htmlFor="time" className="block text-sm font-medium text-spartan-text-secondary mb-2">Minutos Disponibles</label>
                        <input
                            id="time"
                            type="number"
                            value={availableTime}
                            onChange={(e) => setAvailableTime(parseInt(e.target.value, 10) || 0)}
                            className="w-48 bg-spartan-card border border-spartan-border rounded-lg p-3 text-center text-3xl font-bold focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                        />
                    </div>
                    <div className="flex justify-end gap-4 mt-8">
                        <button
                            onClick={hideModal}
                            className="py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAdjust}
                            disabled={availableTime < 15}
                            className="py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-spartan-border"
                        >
                            Ajustar Plan
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeAdjustmentModal;

