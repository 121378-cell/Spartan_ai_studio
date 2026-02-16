import React from 'react';
import type { Routine } from '../types';
import { useAppContext } from '../context/AppContext';
import PlayIcon from './icons/PlayIcon.tsx';
import DumbbellIcon from './icons/DumbbellIcon.tsx';
import AlertTriangleIcon from './icons/AlertTriangleIcon.tsx';

interface WorkoutCardProps {
  routine: Routine;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ routine }) => {
  const { startWorkout, reportTrainingInterruption } = useAppContext();
  const allExercises = routine.blocks.flatMap(block => block.exercises);

  const handleInterruption = () => {
    const today = new Date().toISOString().split('T')[0];
    reportTrainingInterruption(routine.id, today);
  };

  return (
    <div className="relative bg-spartan-card p-6 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-300 flex flex-col md:flex-row items-center gap-6">
      <div className="p-4 bg-spartan-surface rounded-full">
        <DumbbellIcon className="w-8 h-8 text-spartan-gold" />
      </div>
      <div className="flex-1 text-center md:text-left">
        <h3 className="text-2xl font-bold">{routine.name}</h3>
        <p className="text-sm uppercase text-spartan-text-secondary">{routine.focus} • {routine.duration} MINS</p>
        <p className="text-sm text-spartan-text-secondary mt-1 hidden md:block">
            {allExercises.slice(0, 3).map(e => e.name).join(', ')}{allExercises.length > 3 ? '...' : ''}
        </p>
      </div>
      <button 
        onClick={() => startWorkout(routine)}
        className="flex items-center justify-center gap-2 bg-spartan-gold text-spartan-bg font-bold py-3 px-6 rounded-lg hover:bg-yellow-600 transition-colors w-full md:w-auto"
      >
        <PlayIcon className="w-5 h-5"/>
        Empezar Entrenamiento
      </button>
      <button 
        onClick={handleInterruption}
        className="absolute top-2 right-2 text-spartan-text-secondary hover:text-spartan-gold p-1 rounded-full bg-spartan-surface/50 hover:bg-spartan-surface transition-colors"
        title="Reportar un imprevisto"
      >
        <AlertTriangleIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default WorkoutCard;
