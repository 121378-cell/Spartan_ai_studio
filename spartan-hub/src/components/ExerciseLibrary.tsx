import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary.ts';
import type { ExerciseDetail } from '../types.ts';
import { ExerciseAnalysisMapper } from '../services/exerciseAnalysisMapper';
import BrainIcon from './icons/BrainIcon.tsx';

const ExerciseCard: React.FC<{ 
    exercise: ExerciseDetail, 
    onClick: () => void,
    onAnalyze: (e: React.MouseEvent) => void,
    isCompatible: boolean 
}> = ({ exercise, onClick, onAnalyze, isCompatible }) => (
    <div 
        onClick={onClick}
        className="bg-spartan-card p-4 rounded-lg shadow-md text-left w-full h-full transform hover:scale-105 transition-all duration-300 flex flex-col cursor-pointer group border border-transparent hover:border-spartan-gold/30"
    >
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-spartan-gold">{exercise.name}</h3>
            {isCompatible && (
                <button 
                    onClick={onAnalyze}
                    className="p-2 bg-spartan-primary/20 rounded-lg hover:bg-spartan-primary transition-colors group/btn shadow-inner"
                    title="Analizar técnica con IA"
                >
                    <BrainIcon className="w-4 h-4 text-spartan-gold group-hover/btn:text-white" />
                </button>
            )}
        </div>
        <p className="text-sm uppercase text-spartan-text-secondary mt-1">{exercise.muscleGroups.join(' • ')}</p>
        <p className="text-xs text-spartan-text-secondary mt-2">Equipamiento: {exercise.equipment}</p>
        
        {isCompatible && (
            <div className="mt-auto pt-4 flex items-center gap-2 text-[10px] font-bold text-spartan-gold/60 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1 h-1 rounded-full bg-spartan-gold animate-pulse" />
                IA Compatible
            </div>
        )}
    </div>
);


const ExerciseLibrary: React.FC = () => {
    const { showModal } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredExercises = useMemo(() => {
        return EXERCISE_LIBRARY.filter(ex => 
            ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ex.muscleGroups.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [searchTerm]);

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-4xl font-bold text-spartan-gold">Armería de Ejercicios</h1>
                <p className="text-lg text-spartan-text-secondary">Tu arsenal de movimientos para forjar la fuerza.</p>
            </div>
            
            <div className="mb-6">
                <input 
                    type="text"
                    placeholder="Buscar por nombre o grupo muscular..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-spartan-surface p-3 rounded-lg border-2 border-spartan-border focus:border-spartan-gold focus:outline-none transition-colors"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredExercises.map(ex => {
                    const metadata = ExerciseAnalysisMapper.getAnalysisMetadata(ex.name);
                    return (
                        <ExerciseCard 
                            key={ex.id} 
                            exercise={ex} 
                            isCompatible={!!metadata}
                            onClick={() => showModal('exercise-detail', { exerciseId: ex.id })}
                            onAnalyze={(e) => {
                                e.stopPropagation();
                                showModal('form-analysis', { exercise: ex.name });
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default ExerciseLibrary;
