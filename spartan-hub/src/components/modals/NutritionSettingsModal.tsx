import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import type { NutritionSettings } from '../../types.ts';
import DumbbellIcon from '../icons/DumbbellIcon.tsx';
import LotusIcon from '../icons/LotusIcon.tsx';
import BrainIcon from '../icons/BrainIcon.tsx';

const PriorityCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    isSelected: boolean;
    onClick: () => void;
}> = ({ title, description, icon, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
            isSelected ? 'bg-spartan-gold/10 border-spartan-gold' : 'bg-spartan-card border-spartan-border hover:border-spartan-text-secondary'
        }`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-spartan-gold text-spartan-bg' : 'bg-spartan-surface text-spartan-gold'}`}>
                {icon}
            </div>
            <div>
                <h3 className="font-bold">{title}</h3>
                <p className="text-xs text-spartan-text-secondary">{description}</p>
            </div>
        </div>
    </button>
);


const NutritionSettingsModal: React.FC = () => {
    const { hideModal, userProfile, updateNutritionSettings, showToast } = useAppContext();
    const [settings, setSettings] = useState<NutritionSettings>(
        userProfile.nutritionSettings || { priority: 'performance', calorieGoal: 2500, proteinGoal: 180 }
    );

    const handleSave = () => {
        updateNutritionSettings(settings);
        hideModal();
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({...prev, [name]: value ? parseInt(value) : undefined }));
    };

    const handleAutoCalculateProtein = () => {
        if (!userProfile.weightKg) {
            showToast("Primero necesitas añadir tu peso en la evaluación.");
            return;
        }
        const recommendedProtein = Math.round(userProfile.weightKg * 1.8);
        setSettings(prev => ({ ...prev, proteinGoal: recommendedProtein }));
        showToast(`Objetivo de proteína calculado: ${recommendedProtein}g.`);
    };
    
    const proteinRange = userProfile.weightKg 
        ? `Rango recomendado: ${Math.round(userProfile.weightKg * 1.6)}g - ${Math.round(userProfile.weightKg * 2.2)}g`
        : "Añade tu peso para ver el rango recomendado.";

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">Ajustes de Nutrición</h2>
            <p className="text-spartan-text-secondary mb-6">
                Selecciona tu prioridad para este ciclo y establece tus objetivos.
            </p>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-spartan-text-secondary mb-2">Prioridad Nutricional</label>
                    <div className="space-y-3">
                        <PriorityCard 
                            title="Rendimiento Máximo"
                            description="Prioriza la fuerza, la hipertrofia y la producción de energía."
                            icon={<DumbbellIcon className="w-6 h-6"/>}
                            isSelected={settings.priority === 'performance'}
                            onClick={() => setSettings(p => ({...p, priority: 'performance'}))}
                        />
                         <PriorityCard 
                            title="Longevidad y Salud"
                            description="Prioriza la salud intestinal, la gestión de la inflamación y la densidad de nutrientes."
                            icon={<LotusIcon className="w-6 h-6"/>}
                            isSelected={settings.priority === 'longevity'}
                            onClick={() => setSettings(p => ({...p, priority: 'longevity'}))}
                        />
                    </div>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="calorieGoal" className="block text-sm font-medium text-spartan-text-secondary mb-1">Objetivo Calórico (kcal)</label>
                        <input
                            id="calorieGoal"
                            name="calorieGoal"
                            type="number"
                            value={settings.calorieGoal || ''}
                            onChange={handleChange}
                            className="w-full bg-spartan-card border border-spartan-border rounded-lg p-2 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                            placeholder="ej: 2800"
                        />
                    </div>
                    <div>
                        <label htmlFor="proteinGoal" className="block text-sm font-medium text-spartan-text-secondary mb-1">Objetivo Proteína (g)</label>
                        <div className="flex items-center gap-2">
                             <input
                                id="proteinGoal"
                                name="proteinGoal"
                                type="number"
                                value={settings.proteinGoal || ''}
                                onChange={handleChange}
                                className="w-full bg-spartan-card border border-spartan-border rounded-lg p-2 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                                placeholder="ej: 180"
                            />
                            <button onClick={handleAutoCalculateProtein} className="p-2 bg-spartan-gold text-spartan-bg rounded-lg hover:bg-yellow-500" title="Auto-calcular proteína recomendada">
                                <BrainIcon className="w-5 h-5" />
                            </button>
                        </div>
                         <p className="text-xs text-spartan-text-secondary mt-1">{proteinRange}</p>
                    </div>
                </div>

            </div>

            <div className="flex justify-end gap-4 mt-8">
                 <button
                    onClick={hideModal}
                    className="py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    className="py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    Guardar Ajustes
                </button>
            </div>
        </div>
    );
};

export default NutritionSettingsModal;
