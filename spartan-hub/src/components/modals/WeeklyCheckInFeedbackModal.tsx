import React from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import StrategistIcon from '../icons/StrategistIcon.tsx';

interface WeeklyCheckInFeedbackModalProps {
    feedback: string;
}

const WeeklyCheckInFeedbackModal: React.FC<WeeklyCheckInFeedbackModalProps> = ({ feedback }) => {
    const { hideModal } = useAppContext();

    return (
        <div className="text-center">
            <div className="w-20 h-20 bg-spartan-surface rounded-full flex items-center justify-center mx-auto mb-4 text-spartan-gold">
                <StrategistIcon className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-2">Análisis del Estratega</h2>
            <p className="text-spartan-text-secondary mb-6">Basado en tu registro semanal, aquí está tu plan de acción:</p>

            <div className="bg-spartan-card p-4 rounded-lg text-left whitespace-pre-wrap">
                <p>{feedback}</p>
            </div>

            <div className="flex justify-end gap-4 mt-8">
                <button
                    onClick={hideModal}
                    className="py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    Entendido
                </button>
            </div>
        </div>
    );
};

export default WeeklyCheckInFeedbackModal;

