import React, { useState, useContext } from 'react';
// Fix: Correct import path for AppContext
import { AppContext } from '../../context/AppContext';
// Fix: Correct import path for types
import type { Routine } from '../../types';
// Fix: Correct import path for aiService
import { generateRoutine } from '../../services/aiService';
import LoadingSpinner from '../LoadingSpinner.tsx';

const SmartRoutineModal: React.FC = () => {
    const { hideModal, addRoutine, showToast, userProfile } = useContext(AppContext)!;
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedRoutine, setGeneratedRoutine] = useState<Omit<Routine, 'id'> | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            showToast("Por favor, introduce una descripción para la rutina que deseas.");
            return;
        }
        setIsLoading(true);
        setGeneratedRoutine(null);
        const routine = await generateRoutine(prompt, userProfile);
        setIsLoading(false);
        if (routine) {
            setGeneratedRoutine(routine);
        } else {
            showToast("La IA no pudo generar una rutina. Por favor, inténtalo de nuevo.");
        }
    };

    const handleAddRoutine = () => {
        if (generatedRoutine) {
            addRoutine(generatedRoutine);
            showToast("¡Nueva rutina añadida!");
            hideModal();
        }
    };

  return (
    <div>
      <h2 className="text-2xl font-bold text-spartan-gold mb-4">Creador de Rutinas Inteligente</h2>
      <p className="text-spartan-text-secondary mb-6">
        Describe la rutina de entrenamiento que quieres que el Planificador de IA cree. Sé tan específico como quieras.
      </p>
      
      <div className="space-y-4">
        <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-spartan-text-secondary mb-1">Tu Petición</label>
            <textarea
                id="prompt"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-spartan-card border border-spartan-border rounded-lg p-2 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                placeholder="Ej: Una rutina de 4 días torso-pierna para ganar músculo, o un entrenamiento HIIT de 30 minutos para perder grasa."
                disabled={isLoading}
            />
        </div>
        <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-spartan-border"
        >
          {isLoading ? 'Generando...' : 'Generar Rutina'}
        </button>
      </div>

      {isLoading && (
        <div className="mt-6">
            <LoadingSpinner />
        </div>
      )}
      
      {generatedRoutine && (
        <div className="mt-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-spartan-gold mb-2">Vista Previa de la Rutina Generada</h3>
            <div className="bg-spartan-card p-4 rounded-lg">
                 <h4 className="text-lg font-bold">{generatedRoutine.name}</h4>
                 <p className="text-sm uppercase text-spartan-text-secondary mb-3">{generatedRoutine.focus} • {generatedRoutine.duration} MINS</p>
                 <ul className="space-y-3">
                  {generatedRoutine.blocks.map((block, blockIndex) => (
                    <li key={blockIndex}>
                      <p className="text-sm font-bold text-spartan-text-secondary uppercase tracking-wider">{block.name}</p>
                      <ul className="pl-2 mt-1 space-y-1 border-l-2 border-spartan-border">
                        {block.exercises.map((ex, exIndex) => (
                          <li key={exIndex} className="flex justify-between text-sm">
                            <span>{ex.name}</span>
                            <span className="font-mono text-spartan-text-secondary">{`${ex.sets}x${ex.reps}`}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
            </div>
        </div>
      )}

      <div className="flex justify-end gap-4 mt-8">
        <button
          onClick={hideModal}
          className="py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleAddRoutine}
          disabled={!generatedRoutine}
          className="py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-spartan-border"
        >
          Añadir a Mis Rutinas
        </button>
      </div>
    </div>
  );
};

export default SmartRoutineModal;
