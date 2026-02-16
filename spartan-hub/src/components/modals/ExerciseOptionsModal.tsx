import React from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import BrainIcon from '../icons/BrainIcon.tsx';
import BiomechanicIcon from '../icons/BiomechanicIcon.tsx';
import BandAidIcon from '../icons/BandAidIcon.tsx';
import SwapIcon from '../icons/SwapIcon.tsx';
import VideoCameraIcon from '../icons/VideoCameraIcon.tsx';

interface ExerciseOptionsModalProps {
    exerciseName: string;
}

const OptionButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; }> = ({ icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center text-left p-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors"
    >
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-spartan-gold mr-4">
            {icon}
        </div>
        <span className="font-semibold">{label}</span>
    </button>
);

const ExerciseOptionsModal: React.FC<ExerciseOptionsModalProps> = ({ exerciseName }) => {
    const { showModal } = useAppContext();

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-2">Opciones de Ejercicio</h2>
            <p className="text-spartan-text-secondary mb-6">Acciones para: <span className="font-semibold">{exerciseName}</span></p>

            <div className="space-y-3">
                <OptionButton
                    icon={<VideoCameraIcon className="w-6 h-6" />}
                    label="Analizar Técnica con IA"
                    onClick={() => showModal('video-feedback', { exerciseName })}
                />
                <OptionButton
                    icon={<BiomechanicIcon className="w-6 h-6" />}
                    label="Ver Biomecánica"
                    onClick={() => showModal('exercise-detail', { exerciseName })}
                />
                 <OptionButton
                    icon={<BandAidIcon className="w-6 h-6" />}
                    label="Reportar Molestia"
                    onClick={() => showModal('discomfort-report', {}, { size: 'medium' })}
                />
                 <OptionButton
                    icon={<SwapIcon className="w-6 h-6" />}
                    label="Sustituir Ejercicio"
                    onClick={() => showModal('exercise-library')}
                />
            </div>
        </div>
    );
};

export default ExerciseOptionsModal;
