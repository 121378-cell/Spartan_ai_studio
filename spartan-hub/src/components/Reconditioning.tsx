import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import BrainIcon from './icons/BrainIcon.tsx';
import LotusIcon from './icons/LotusIcon.tsx';
import BandAidIcon from './icons/BandAidIcon.tsx';

const Reconditioning: React.FC = () => {
  const { reconditioningPlans, showModal, requestAiReconditioningPlanSuggestion } = useAppContext();

  const focusColors: { [key: string]: string } = {
      'physical': 'border-blue-500',
      'mental': 'border-purple-500',
      'mixed': 'border-green-500',
  }

  const activityTypeColors: { [key: string]: string } = {
      'physical': 'bg-blue-500/20 text-blue-300',
      'mental': 'bg-purple-500/20 text-purple-300',
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-4xl font-bold text-spartan-gold">Reacondicionamiento</h1>
        <div className="flex gap-4">
            <button 
              onClick={requestAiReconditioningPlanSuggestion}
              className="flex items-center gap-2 bg-spartan-card text-spartan-text hover:bg-spartan-border font-bold py-2 px-4 rounded-lg transition-colors"
              title="Obtener sugerencias de planes de la IA"
            >
              <BrainIcon className="w-5 h-5" />
              Sugerencias de IA
            </button>
            <button 
              onClick={() => showModal('create-reconditioning-plan')}
              className="bg-spartan-gold text-spartan-bg font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Crear Nuevo Plan
            </button>
        </div>
      </div>
      
       <div className="mb-8 bg-spartan-surface p-6 rounded-lg shadow-lg">
          <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                  <BandAidIcon className="w-12 h-12 text-spartan-gold" />
              </div>
              <div className="flex-grow text-center md:text-left">
                  <h2 className="text-2xl font-bold">¿Sientes alguna molestia o dolor?</h2>
                  <p className="text-spartan-text-secondary mt-1">Obtén un protocolo de ajuste biomecánico y pre-habilitación de la IA para entrenar de forma segura e inteligente.</p>
              </div>
              <button
                  onClick={() => showModal('discomfort-report', {}, { size: 'medium' })}
                  className="bg-spartan-card text-spartan-text font-bold py-3 px-6 rounded-lg hover:bg-spartan-border transition-colors w-full md:w-auto"
              >
                  Reportar Molestia
              </button>
          </div>
      </div>

      {reconditioningPlans.length === 0 ? (
        <div className="text-center bg-spartan-surface p-10 rounded-lg">
          <p className="text-xl text-spartan-text-secondary">Aún no tienes planes de reacondicionamiento.</p>
          <p className="mt-2">Usa el Entrenador IA para crear uno o créalo manualmente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reconditioningPlans.map((plan) => (
            <div key={plan.id} className={`bg-spartan-card p-6 rounded-lg shadow-md border-t-4 ${focusColors[plan.focus]} flex flex-col`}>
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-2">
                    <LotusIcon className="w-6 h-6 text-spartan-gold" />
                    <h2 className="text-2xl font-bold text-spartan-gold">{plan.name}</h2>
                </div>
                <p className="text-sm uppercase text-spartan-text-secondary mb-4">{plan.focus}</p>
                <ul className="space-y-2">
                  {plan.activities.map((activity, index) => (
                    <li key={index}>
                      <p className="font-semibold">{activity.name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activityTypeColors[activity.type]}`}>{activity.type}</span>
                        <p className="text-sm text-spartan-text-secondary">{activity.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reconditioning;
