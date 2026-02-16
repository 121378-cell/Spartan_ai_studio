import React from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import CheckIcon from '../icons/CheckIcon.tsx';
import TrendingUpIcon from '../icons/TrendingUpIcon.tsx';

interface WorkoutSummary {
    name: string;
    duration: number;
    volume: number;
    progressions?: { exerciseName: string; newWeight: number }[];
}

interface WorkoutSummaryModalProps {
    summary: WorkoutSummary;
}

const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({ summary }) => {
    const { hideModal } = useAppContext();

    return (
        <div className="text-center">
            <div className="w-20 h-20 bg-spartan-gold rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="w-12 h-12 text-spartan-bg" />
            </div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-2">¡Entrenamiento Completado!</h2>
            <p className="text-spartan-text-secondary mb-6">Buen trabajo, has completado la rutina: <strong>{summary.name}</strong>.</p>

            <div className="grid grid-cols-2 gap-4 text-left bg-spartan-card p-4 rounded-lg">
                <div>
                    <p className="text-sm text-spartan-text-secondary">Duración</p>
                    <p className="text-2xl font-bold">{summary.duration} <span className="text-base font-normal">minutos</span></p>
                </div>
                <div>
                    <p className="text-sm text-spartan-text-secondary">Volumen Total</p>
                    <p className="text-2xl font-bold">{summary.volume.toLocaleString()} <span className="text-base font-normal">kg</span></p>
                </div>
            </div>
            
            {summary.progressions && summary.progressions.length > 0 && (
                <div className="mt-6 text-left">
                    <h3 className="text-lg font-bold text-spartan-gold mb-2">Progresiones Sugeridas</h3>
                    <div className="bg-spartan-card p-4 rounded-lg space-y-2 max-h-32 overflow-y-auto">
                        {summary.progressions.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <TrendingUpIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <p><span className="font-semibold">{p.exerciseName}:</span> Aumentar a {p.newWeight} kg la próxima vez.</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            <div className="flex justify-end gap-4 mt-8">
                <button
                    onClick={hideModal}
                    className="py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    Hecho
                </button>
            </div>
        </div>
    );
};

export default WorkoutSummaryModal;
