
import React from 'react';
import OracleIcon from './icons/OracleIcon.tsx';

interface PropheticAlertProps {
    reason: string;
    onAcknowledge: () => void;
}

const PropheticAlert: React.FC<PropheticAlertProps> = ({ reason, onAcknowledge }) => {
    return (
        <div className="bg-yellow-900/50 border-2 border-spartan-gold p-6 rounded-lg shadow-lg mb-8 animate-fadeIn flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
                <OracleIcon className="w-16 h-16 text-spartan-gold" />
            </div>
            <div className="flex-grow text-center md:text-left">
                <h3 className="text-2xl font-bold text-spartan-gold">Alerta Profética</h3>
                <p className="text-spartan-text-secondary mt-2">
                    {reason} El Oráculo predice un riesgo de desmotivación y aconseja una acción preventiva para proteger tu progreso.
                </p>
            </div>
            <button
                onClick={onAcknowledge}
                className="bg-spartan-card text-spartan-text font-bold py-3 px-6 rounded-lg hover:bg-spartan-border transition-colors w-full md:w-auto"
            >
                Ver Intervención
            </button>
        </div>
    );
};

export default PropheticAlert;

