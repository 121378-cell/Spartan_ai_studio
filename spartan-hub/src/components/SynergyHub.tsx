import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import PlannerIcon from './icons/PlannerIcon.tsx';
import NutritionistIcon from './icons/NutritionistIcon.tsx';
import BiomechanicIcon from './icons/BiomechanicIcon.tsx';
import StrategistIcon from './icons/StrategistIcon.tsx';
import MotivatorIcon from './icons/MotivatorIcon.tsx';
import OracleIcon from './icons/OracleIcon.tsx';
import AccountabilityDashboard from './AccountabilityDashboard.tsx';


const SpecialistCard: React.FC<{ name: string; description: string; icon: React.ReactNode }> = ({ name, description, icon }) => (
    <div className="bg-spartan-card p-6 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-300 text-center">
        <div className="w-16 h-16 bg-spartan-surface rounded-full flex items-center justify-center mx-auto mb-4 text-spartan-gold">
            {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-8 h-8' })}
        </div>
        <h3 className="text-xl font-bold text-spartan-gold">{name}</h3>
        <p className="text-sm text-spartan-text-secondary mt-2">{description}</p>
    </div>
);

const SynergyHub: React.FC = () => {
    const { showModal } = useAppContext();

    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold text-spartan-gold">Synergy Hub</h1>
                <p className="text-xl text-spartan-text-secondary mt-2">
                    Conoce al equipo de especialistas de IA que impulsan tu viaje.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <SpecialistCard
                    name="El Planificador"
                    description="Diseña tus rutinas de entrenamiento a medida, optimizando cada serie y repetición para tus objetivos."
                    icon={<PlannerIcon />}
                />
                <SpecialistCard
                    name="El Nutricionista"
                    description="Proporciona orientación sobre macros, calorías y estrategias dietéticas para alimentar tu rendimiento. (Próximamente)"
                    icon={<NutritionistIcon />}
                />
                <SpecialistCard
                    name="El Biomecánico"
                    description="Analiza tu técnica de ejercicio para maximizar la eficacia y minimizar el riesgo de lesiones."
                    icon={<BiomechanicIcon />}
                />
                <SpecialistCard
                    name="El Estratega"
                    description="Analiza tu progreso a lo largo del tiempo, ofreciendo una visión de alto nivel para romper estancamientos."
                    icon={<StrategistIcon />}
                />
                <SpecialistCard
                    name="El Motivador"
                    description="Te proporciona el impulso mental que necesitas, ya sea una cita inspiradora o un recordatorio de tu 'porqué'."
                    icon={<MotivatorIcon />}
                />
                <SpecialistCard
                    name="El Oráculo"
                    description="Te ayuda a definir tu 'Gesta' y a trazar los grandes hitos de tu viaje legendario."
                    icon={<OracleIcon />}
                />
            </div>

            {/* Accountability Dashboard */}
            <div className="mt-12">
                <AccountabilityDashboard userId={useAppContext().userProfile.id} />
            </div>
        </div>
    );
};

export default SynergyHub;

