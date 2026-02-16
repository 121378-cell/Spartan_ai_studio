import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import { generateReconditioningPlan } from '../../services/aiService.ts';
import type { ReconditioningPlan } from '../../types.ts';
import LoadingSpinner from '../LoadingSpinner.tsx';

const CreateReconditioningPlanModal: React.FC = () => {
    const { hideModal, addReconditioningPlan, showToast, userProfile } = useAppContext();
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<Omit<ReconditioningPlan, 'id'> | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            showToast("Por favor, describe qué tipo de recuperación necesitas.");
            return;
        }
        setIsLoading(true);
        setGeneratedPlan(null);
        const plan = await generateReconditioningPlan(prompt, userProfile);
        setIsLoading(false);
        if (plan) {
            setGeneratedPlan(plan);
        } else {
            showToast("La IA no pudo generar un plan. Por favor, inténtalo de nuevo.");
        }
    };

    const handleAddPlan = () => {
        if (generatedPlan) {
            addReconditioningPlan(generatedPlan);
            showToast("¡Nuevo plan de reacondicionamiento añadido!");
            hideModal();
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">Creador de Planes de Recuperación IA</h2>
            <p className="text-spartan-text-secondary mb-6">
                Describe cómo te sientes o qué necesitas recuperar (ej: "mis piernas están muy doloridas", "necesito relajarme antes de dormir").
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
                        placeholder="Ej: Estoy agotado mentalmente por el trabajo."
                        disabled={isLoading}
                    />
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-spartan-border"
                >
                    {isLoading ? 'Generando...' : 'Generar Plan de Recuperación'}
                </button>
            </div>

            {isLoading && (
                <div className="mt-6">
                    <LoadingSpinner />
                </div>
            )}
            
            {generatedPlan && (
                <div className="mt-6 animate-fadeIn">
                    <h3 className="text-xl font-bold text-spartan-gold mb-2">Vista Previa del Plan Generado</h3>
                    <div className="bg-spartan-card p-4 rounded-lg">
                         <h4 className="text-lg font-bold">{generatedPlan.name}</h4>
                         <p className="text-sm uppercase text-spartan-text-secondary mb-3">{generatedPlan.focus}</p>
                         <ul className="space-y-2">
                            {generatedPlan.activities.map((activity, index) => (
                                <li key={index}>
                                    <p className="font-semibold">{activity.name} <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activity.type === 'physical' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>{activity.type}</span></p>
                                    <p className="text-sm text-spartan-text-secondary">{activity.description}</p>
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
                    onClick={handleAddPlan}
                    disabled={!generatedPlan}
                    className="py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-spartan-border"
                >
                    Añadir a Mis Planes
                </button>
            </div>
        </div>
    );
};

export default CreateReconditioningPlanModal;
