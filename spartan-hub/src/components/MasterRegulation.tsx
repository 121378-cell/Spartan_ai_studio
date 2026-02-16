import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import CogIcon from './icons/CogIcon.tsx';
import MoonIcon from './icons/MoonIcon.tsx';
import SunIcon from './icons/SunIcon.tsx';
import ThermometerIcon from './icons/ThermometerIcon.tsx';
import SnowflakeIcon from './icons/SnowflakeIcon.tsx';
import LungsIcon from './icons/LungsIcon.tsx';

const ProtocolCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onAction?: () => void; actionLabel?: string }> = ({ title, description, icon, onAction, actionLabel }) => (
    <div className="bg-spartan-surface p-6 rounded-lg shadow-lg flex flex-col h-full">
        <div className="flex items-start gap-4 mb-3">
            <div className="w-12 h-12 bg-spartan-card rounded-full flex items-center justify-center text-spartan-gold flex-shrink-0">
                {icon}
            </div>
            <div>
                <h3 className="text-xl font-bold">{title}</h3>
            </div>
        </div>
        <p className="text-spartan-text-secondary flex-grow mb-6">{description}</p>
        {onAction && actionLabel && (
            <button
                onClick={onAction}
                className="w-full mt-auto bg-spartan-card text-spartan-text font-bold py-3 px-4 rounded-lg hover:bg-spartan-border transition-colors"
            >
                {actionLabel}
            </button>
        )}
    </div>
);

const MasterRegulation: React.FC = () => {
    const { userProfile, showModal } = useAppContext();
    const { targetBedtime } = userProfile.masterRegulationSettings;
    const { chronotypeAnalysis } = userProfile;

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-4xl font-bold text-spartan-gold">Regulación Maestra</h1>
                 <button 
                    onClick={() => showModal('master-regulation-settings')}
                    className="flex items-center gap-2 bg-spartan-card text-spartan-text hover:bg-spartan-border font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    <CogIcon className="w-5 h-5" />
                    Ajustes
                </button>
            </div>
            <p className="text-lg text-spartan-text-secondary mb-10">Domina tu biología para desbloquear un rendimiento y una recuperación de élite. Estos protocolos gestionan tu sistema nervioso y hormonal.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Protocolo de Sueño</h2>
                    <div className="flex items-center gap-4 mb-4">
                        <MoonIcon className="w-8 h-8 text-spartan-gold"/>
                        <div>
                            <p className="text-sm text-spartan-text-secondary">HORA OBJETIVO</p>
                            <p className="text-2xl font-bold">{targetBedtime}</p>
                        </div>
                    </div>
                     <p className="text-sm text-spartan-text-secondary">Tu protocolo pre-sueño es tu herramienta de recuperación más potente. Inícialo 60 minutos antes de tu hora objetivo. Incluye: no más pantallas, luz tenue y lectura ligera.</p>
                </div>
                
                <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Ritmo Circadiano</h2>
                    {chronotypeAnalysis ? (
                        <div>
                            <p className="text-sm text-spartan-text-secondary">CRONOTIPO DETECTADO</p>
                            <p className="text-2xl font-bold text-spartan-gold mb-2">{chronotypeAnalysis.chronotype}</p>
                            <p className="text-sm text-spartan-text-secondary">{chronotypeAnalysis.description}</p>
                        </div>
                    ) : (
                         <div>
                            <p className="text-spartan-text-secondary mb-4">Descubre tu cronotipo para alinear tu día con tu ritmo biológico natural.</p>
                             <button onClick={() => showModal('chronotype-questionnaire')} className="w-full bg-spartan-card py-2 rounded-lg font-semibold hover:bg-spartan-border">Realizar Cuestionario</button>
                        </div>
                    )}
                </div>

                <ProtocolCard
                    title="Protocolo de Respiración"
                    description="Utiliza la respiración para cambiar tu estado mental al instante. Calma el estrés con la 'Respiración de Coherencia' (5s dentro, 5s fuera) o energízate con la 'Respiración Cíclica'."
                    icon={<LungsIcon className="w-8 h-8" />}
                />
                 <ProtocolCard
                    title="Exposición a la Luz"
                    description="Recibe 10-15 minutos de luz solar directa en tus ojos tan pronto como sea posible después de despertar. Esto ancla tu ritmo circadiano, mejora el estado de ánimo y la calidad del sueño."
                    icon={<SunIcon className="w-8 h-8" />}
                />
                 <ProtocolCard
                    title="Protocolos de Hormesis"
                    description="Usa estresores controlados para fortalecer tu resiliencia. La exposición al frío aumenta el estado de alerta y reduce la inflamación; el calor mejora la salud cardiovascular."
                    icon={<div className="flex gap-1"><SnowflakeIcon className="w-6 h-6 text-blue-400" /><ThermometerIcon className="w-6 h-6 text-red-500" /></div>}
                    onAction={() => showModal('hormesis-protocol')}
                    actionLabel="Ver Protocolos"
                />

            </div>
        </div>
    );
};

export default MasterRegulation;

