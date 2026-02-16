import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
// import { getNutritionPlan } from '../services/aiService.ts';
import type { NutritionPlan } from '../types.ts';
import CogIcon from './icons/CogIcon.tsx';
import BrainIcon from './icons/BrainIcon.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';
import DumbbellIcon from './icons/DumbbellIcon.tsx';
import LotusIcon from './icons/LotusIcon.tsx';
import GutIcon from './icons/GutIcon.tsx';
import NutritionPhotoUploader from './NutritionPhotoUploader.tsx';

const NutritionalPhilosophyCard: React.FC<{ priority: 'performance' | 'longevity' }> = ({ priority }) => {
    const content = {
        performance: {
            title: "Filosofía: Combustible para el Rendimiento",
            icon: <DumbbellIcon className="w-8 h-8" />,
            text: "Tu enfoque actual es tratar la comida como combustible de alto octanaje. Priorizamos los carbohidratos alrededor de tus entrenamientos para maximizar la energía y la reposición de glucógeno, y una alta ingesta de proteínas para construir y reparar el tejido muscular. Cada comida es una oportunidad para potenciar tu próxima sesión."
        },
        longevity: {
            title: "Filosofía: Nutrición para la Vitalidad",
            icon: <LotusIcon className="w-8 h-8" />,
            text: "Tu enfoque actual es utilizar la comida como información para optimizar tu salud a largo plazo. Priorizamos las grasas saludables para reducir la inflamación, la fibra para la salud intestinal y una densidad de micronutrientes para la función celular. Cada comida es una inversión en tu resiliencia y vitalidad futuras."
        }
    };
    
    const selected = content[priority];

    return (
        <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
            <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-spartan-card rounded-full flex items-center justify-center text-spartan-gold flex-shrink-0">
                    {selected.icon}
                </div>
                <div>
                    <h2 className="text-2xl font-bold mb-2">{selected.title}</h2>
                    <p className="text-spartan-text-secondary">{selected.text}</p>
                </div>
            </div>
        </div>
    );
};


const NutritionPlanDisplay: React.FC<{ plan: NutritionPlan }> = ({ plan }) => (
    <div className="mt-6 animate-fadeIn bg-spartan-surface p-6 rounded-lg">
         <h2 className="text-2xl font-bold mb-4 text-spartan-gold">Sugerencia del Nutricionista IA</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-spartan-card p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Macros Diarios</h3>
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div><p className="text-2xl font-bold">{plan.macros.calories}</p><p className="text-xs text-spartan-text-secondary">CALORÍAS</p></div>
                    <div><p className="text-2xl font-bold">{plan.macros.protein}g</p><p className="text-xs text-spartan-text-secondary">PROTEÍNA</p></div>
                    <div><p className="text-2xl font-bold">{plan.macros.carbs}g</p><p className="text-xs text-spartan-text-secondary">CARBS</p></div>
                    <div><p className="text-2xl font-bold">{plan.macros.fats}g</p><p className="text-xs text-spartan-text-secondary">GRASAS</p></div>
                </div>
            </div>
             <div className="bg-spartan-card p-4 rounded-lg">
                 <h3 className="font-bold text-lg mb-2">Timing de Nutrientes</h3>
                 <p className="text-sm text-spartan-text-secondary">{plan.timing}</p>
             </div>
             <div className="bg-spartan-card p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Suplementos Sugeridos</h3>
                <ul className="space-y-2">
                    {plan.supplements.map((s, i) => (
                        <li key={i} className="text-sm">
                            <span className="font-semibold">{s.name}:</span>
                            <span className="text-spartan-text-secondary"> {s.reason}</span>
                        </li>
                    ))}
                </ul>
             </div>
             <div className="bg-spartan-card p-4 rounded-lg">
                 <h3 className="font-bold text-lg mb-2">Ideas de Comidas</h3>
                 <ul className="list-disc list-inside text-sm text-spartan-text-secondary space-y-1">
                    {plan.mealIdeas.map((idea, i) => <li key={i}>{idea}</li>)}
                 </ul>
             </div>
             {/* Functional Nutrition Section */}
             <div className="md:col-span-2 bg-spartan-card p-4 rounded-lg border-t-4 border-spartan-gold">
                <div className="flex items-center gap-3 mb-3">
                    <GutIcon className="w-6 h-6 text-spartan-gold" />
                    <h3 className="font-bold text-lg">Nutrición Funcional (Salud Intestinal)</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold mb-1">Alimentos Funcionales Recomendados:</h4>
                         <ul className="space-y-2">
                            {plan.functionalFoods.map((food, i) => (
                                <li key={i} className="text-sm">
                                    <span className="font-semibold">{food.name}:</span>
                                    <span className="text-spartan-text-secondary"> {food.benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold mb-1">Estrategia Anti-Inflamatoria:</h4>
                        <p className="text-sm text-spartan-text-secondary">{plan.inflammatoryFoodsToLimit}</p>
                    </div>
                </div>
             </div>
         </div>
    </div>
);

const Nutrition: React.FC = () => {
    const { userProfile, showModal } = useAppContext();
    const { priority, calorieGoal, proteinGoal } = userProfile.nutritionSettings;
    const [isLoading, setIsLoading] = useState(false);
    const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null);

    const handleGetSuggestion = async () => {
        setIsLoading(true);
        setNutritionPlan(null);
        setIsLoading(false);
        // showToast("Funcionalidad temporalmente desactivada.");
    };

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-4xl font-bold text-spartan-gold">Nutrición</h1>
        <button 
          onClick={() => showModal('nutrition-settings')}
          className="flex items-center gap-2 bg-spartan-card text-spartan-text hover:bg-spartan-border font-bold py-2 px-4 rounded-lg transition-colors"
          title="Ajustes de Nutrición"
        >
          <CogIcon className="w-5 h-5" />
          Ajustes
        </button>
      </div>
      
       <div className="bg-spartan-surface p-6 rounded-lg mb-8">
            <h2 className="text-2xl font-bold mb-4">Tus Objetivos Nutricionales</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-spartan-card p-3 rounded-lg">
                    <p className="text-xs text-spartan-text-secondary">PRIORIDAD</p>
                    <p className="font-bold text-lg capitalize text-spartan-gold">{priority}</p>
                </div>
                <div className="bg-spartan-card p-3 rounded-lg">
                    <p className="text-xs text-spartan-text-secondary">OBJETIVO CALÓRICO</p>
                    <p className="font-bold text-lg">{calorieGoal?.toLocaleString() || 'N/A'} kcal</p>
                </div>
                <div className="bg-spartan-card p-3 rounded-lg">
                    <p className="text-xs text-spartan-text-secondary">OBJETIVO DE PROTEÍNA</p>
                    <p className="font-bold text-lg">{proteinGoal || 'N/A'} g</p>
                </div>
            </div>
        </div>

        <div className="mb-8">
            <NutritionalPhilosophyCard priority={priority} />
        </div>

        {/* Nutrition Photo Scanner */}
        <div className="mb-8">
            <NutritionPhotoUploader
                userId={userProfile.id}
                onAnalysisComplete={(result) => console.log('Analysis complete:', result)}
                onError={(error) => console.error('Analysis error:', error)}
            />
        </div>

        <div className="text-center">
             <button 
                onClick={handleGetSuggestion}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 bg-spartan-gold text-spartan-bg font-bold py-3 px-6 rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-spartan-border"
             >
                <BrainIcon className="w-5 h-5" />
                {isLoading ? "Generando..." : "Generar Sugerencia de IA"}
            </button>
        </div>

        {isLoading && <div className="mt-6"><LoadingSpinner /></div>}
        {nutritionPlan && <NutritionPlanDisplay plan={nutritionPlan} />}

    </div>
  );
};

export default Nutrition;
