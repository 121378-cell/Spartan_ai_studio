import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import NeuroIcon from './icons/NeuroIcon.tsx';

const NeuroActivationCard: React.FC = () => {
    const { showModal } = useAppContext();

    const handleStartVisualization = () => {
        // This would typically fetch a dynamic script from the AI service
        const visualizationScript = {
            title: "Visualización Pre-Entrenamiento",
            script: "Cierra los ojos. Respira hondo...\nSiente la energía fluir hacia tus músculos...\nVisualiza cada repetición: fuerte, controlada, perfecta.\nEstás preparado. Eres poderoso. Abre los ojos."
        };
        showModal('visualization', visualizationScript);
    };

    return (
        <div className="bg-spartan-card p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-spartan-gold mb-4">Activación Neuronal</h3>
            <p className="text-spartan-text-secondary mb-4">Prepara tu mente para un rendimiento máximo. Una visualización guiada de 2 minutos para conectar mente y músculo.</p>
            <button
                onClick={handleStartVisualization}
                className="w-full flex items-center justify-center gap-2 bg-spartan-surface hover:bg-spartan-border font-bold py-3 px-4 rounded-lg transition-colors"
            >
                <NeuroIcon className="w-6 h-6 text-spartan-gold" />
                Comenzar Activación
            </button>
        </div>
    );
};

export default NeuroActivationCard;

