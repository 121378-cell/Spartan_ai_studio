import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import OrchestraIcon from '../icons/OrchestraIcon.tsx';
import LoadingSpinner from '../LoadingSpinner.tsx';

interface LogisticsInterventionModalProps {
    payload: {
        routineId: string;
        date: string;
    };
}

const LogisticsInterventionModal: React.FC<LogisticsInterventionModalProps> = ({ payload }) => {
    const { hideModal, recalculateSchedule, compensateSchedule } = useAppContext();
    const { routineId, date } = payload;
    const [isLoading, setIsLoading] = useState(false);

    const handleRecalculate = async () => {
        setIsLoading(true);
        await recalculateSchedule(routineId, date);
        setIsLoading(false);
        hideModal();
    };

    const handleCompensate = async () => {
        setIsLoading(true);
        await compensateSchedule(routineId, date);
        setIsLoading(false);
        hideModal();
    };

    return (
        <div>
            <div className="text-center">
                <OrchestraIcon className="w-16 h-16 mx-auto text-spartan-gold mb-4" />
                <h2 className="text-2xl font-bold text-spartan-gold mb-2">Intervención del Director</h2>
                <p className="text-lg text-spartan-text-secondary">
                    Entendido, reestructuraré la partitura. ¿Tienes disponibilidad para al menos 20 minutos de movimiento en las próximas 48 horas?
                </p>
            </div>
            
            {isLoading ? (
                <div className="mt-8">
                    <LoadingSpinner />
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
                    <button
                        onClick={handleCompensate}
                        className="py-3 px-6 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors font-semibold"
                    >
                        No, es imposible
                    </button>
                    <button
                        onClick={handleRecalculate}
                        className="py-3 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                        Sí, tengo tiempo
                    </button>
                </div>
            )}
        </div>
    );
};

export default LogisticsInterventionModal;
