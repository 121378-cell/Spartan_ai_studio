import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAchievementData } from '../hooks/useAchievementData.ts';
import TrophyIcon from './icons/TrophyIcon.tsx';
import MoonIcon from './icons/MoonIcon.tsx';
import FireIcon from './icons/FireIcon.tsx';
import ZapIcon from './icons/ZapIcon.tsx';

const AchievementCard: React.FC<{ icon: React.ReactNode; title: string; value: string; description: string }> = ({ icon, title, value, description }) => (
    <div className="bg-spartan-card p-6 rounded-lg shadow-md text-center transform hover:scale-105 transition-transform duration-300">
        <div className="w-16 h-16 bg-spartan-surface rounded-full flex items-center justify-center mx-auto mb-4 text-spartan-gold">
            {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-8 h-8' })}
        </div>
        <p className="text-3xl font-bold">{value}</p>
        <h4 className="text-lg font-semibold text-spartan-gold mt-1">{title}</h4>
        <p className="text-sm text-spartan-text-secondary mt-2">{description}</p>
    </div>
);


const AchievementWall: React.FC = () => {
    const { userProfile, workoutHistory, dailyLogs, habitLogs } = useAppContext();
    const { bestVolume, longestHabit, bestSleepStreak, focusProtocolsUsed } = useAchievementData(
        userProfile,
        workoutHistory,
        dailyLogs,
        habitLogs
    );

    return (
        <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-spartan-gold mb-2">Muro de Logros Holísticos</h2>
            <p className="text-spartan-text-secondary mb-6">
                Celebrando cada faceta de tu fuerza: física, mental y de carácter.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <AchievementCard
                    icon={<TrophyIcon />}
                    title="PR de Volumen"
                    value={`${bestVolume.toLocaleString()} kg`}
                    description="El mayor peso total levantado en una sola sesión de entrenamiento."
                />
                <AchievementCard
                    icon={<FireIcon />}
                    title="Racha de Hábito"
                    value={`${longestHabit.streak} Días`}
                    description={`Tu racha más larga para el hábito clave: '${longestHabit.name}'.`}
                />
                <AchievementCard
                    icon={<MoonIcon />}
                    title="Racha de Sueño"
                    value={`${bestSleepStreak} Noches`}
                    description="El mayor número de noches consecutivas con una recuperación de alta calidad (4/5 o superior)."
                />
                <AchievementCard
                    icon={<ZapIcon />}
                    title="Activaciones de Foco"
                    value={`${focusProtocolsUsed}`}
                    description="Número de veces que has utilizado un protocolo para entrar en estado de trabajo profundo."
                />
            </div>
        </div>
    );
};

export default AchievementWall;
