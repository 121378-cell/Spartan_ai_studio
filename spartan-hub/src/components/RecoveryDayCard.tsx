import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import LotusIcon from './icons/LotusIcon.tsx';
import BrainIcon from './icons/BrainIcon.tsx';

const RecoveryDayCard: React.FC = () => {
    const { setCurrentPage, requestAiReconditioningPlanSuggestion } = useAppContext();

    const handleExplore = () => {
        setCurrentPage('reconditioning');
    };

    return (
        <div className="bg-spartan-card p-6 rounded-lg shadow-md border-l-4 border-blue-500 flex flex-col items-center text-center">
            <LotusIcon className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-2xl font-bold">Recuperación Activa</h3>
            <p className="text-spartan-text-secondary mt-2 mb-6">
                Tu Carga Sinérgica es baja. Hoy, la victoria se encuentra en la recuperación.
                Priorizar el descanso ahora te hará más fuerte mañana.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button
                    onClick={handleExplore}
                    className="flex-1 flex items-center justify-center gap-2 bg-spartan-surface hover:bg-spartan-border font-bold py-3 px-4 rounded-lg transition-colors"
                >
                    <LotusIcon className="w-5 h-5" />
                    Explorar Protocolos
                </button>
                <button
                    onClick={requestAiReconditioningPlanSuggestion}
                    className="flex-1 flex items-center justify-center gap-2 bg-spartan-surface hover:bg-spartan-border font-bold py-3 px-4 rounded-lg transition-colors"
                >
                    <BrainIcon className="w-5 h-5" />
                    Sugerencia de IA
                </button>
            </div>
        </div>
    );
};

export default RecoveryDayCard;

