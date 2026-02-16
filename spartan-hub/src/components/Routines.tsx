import React from 'react';
// Fix: Correct import path for AppContext
import { useAppContext } from '../context/AppContext';
import BrainIcon from './icons/BrainIcon.tsx';
import InfoIcon from './icons/InfoIcon.tsx';
import SwapIcon from './icons/SwapIcon.tsx';

const Routines: React.FC = () => {
  const { routines, startWorkout, showModal, requestAiRoutineSuggestion } = useAppContext();

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-4xl font-bold text-spartan-gold">Tus Rutinas</h1>
        <div className="flex gap-4">
            <button 
              onClick={requestAiRoutineSuggestion}
              className="flex items-center gap-2 bg-spartan-card text-spartan-text hover:bg-spartan-border font-bold py-2 px-4 rounded-lg transition-colors"
              title="Obtener sugerencias de rutinas de la IA"
            >
              <BrainIcon className="w-5 h-5" />
              Sugerencias de IA
            </button>
            <button 
              onClick={() => showModal('smart-routine-creator')}
              className="bg-spartan-gold text-spartan-bg font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Crear Nueva Rutina
            </button>
        </div>
      </div>

      {routines.length === 0 ? (
        <div className="text-center bg-spartan-surface p-10 rounded-lg">
          <p className="text-xl text-spartan-text-secondary">Aún no tienes rutinas.</p>
          <p className="mt-2">Usa el Entrenador IA para crear una nueva o créala manualmente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routines.map((routine) => (
            <div key={routine.id} className="bg-spartan-card p-6 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-300 flex flex-col">
              <div className="flex-grow">
                <h2 className="text-2xl font-bold text-spartan-gold mb-2">{routine.name}</h2>
                <p className="text-sm uppercase text-spartan-text-secondary mb-1">{routine.focus} • {routine.duration} MINS</p>
                {routine.objective && <p className="text-sm italic text-spartan-text-secondary mb-4">"{routine.objective}"</p>}
                
                <ul className="space-y-3">
                  {routine.blocks.map((block, blockIndex) => (
                    <li key={blockIndex}>
                      <p className="text-sm font-bold text-spartan-text-secondary uppercase tracking-wider">{block.name}</p>
                      <ul className="pl-2 mt-1 space-y-1 border-l-2 border-spartan-border">
                        {block.exercises.map((ex, exIndex) => (
                          <li key={exIndex} className="flex justify-between items-center text-sm group">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => showModal('exercise-detail', { exerciseName: ex.name })}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label={`Ver detalles de ${ex.name}`}
                                >
                                    <InfoIcon className="w-4 h-4 text-spartan-gold"/>
                                </button>
                                <span>{ex.name}</span>
                            </div>
                            <span className="font-mono text-spartan-text-secondary">{`${ex.sets}x${ex.reps}`}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                 <button 
                    onClick={() => showModal('adapt-routine', { routine })}
                    className="p-2 rounded-lg text-spartan-text-secondary hover:bg-spartan-surface transition-colors"
                    title="Adaptar o traducir esta rutina"
                  >
                      <SwapIcon className="w-5 h-5" />
                  </button>
                <button 
                  onClick={() => startWorkout(routine)}
                  className="bg-spartan-gold text-spartan-bg font-bold py-2 px-4 rounded-lg text-sm hover:bg-yellow-500 transition-colors"
                >
                  Empezar Entrenamiento
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Routines;
