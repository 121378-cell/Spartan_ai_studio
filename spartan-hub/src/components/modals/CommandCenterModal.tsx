import React from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import { useSynergisticLoad } from '../../hooks/useSynergisticLoad.ts';
import ZapIcon from '../icons/ZapIcon.tsx';
import ClockIcon from '../icons/ClockIcon.tsx';
import BrainIcon from '../icons/BrainIcon.tsx';

const CommandCenterModal: React.FC = () => {
    const { userProfile, workoutHistory, dailyLogs, weeklyCheckIns } = useAppContext();
    const synergisticLoad = useSynergisticLoad(workoutHistory, dailyLogs);

    const lastCheckIn = weeklyCheckIns.length > 0 ? weeklyCheckIns[weeklyCheckIns.length - 1] : null;

    const stressLevel = lastCheckIn ? lastCheckIn.perceivedStress : userProfile.evaluationData?.stressLevel;
    const sleepQuality = lastCheckIn ? lastCheckIn.sleepQuality : userProfile.evaluationData?.energyLevel;

    let scoreColorClass = 'text-red-500';
    if (synergisticLoad.score >= 80) scoreColorClass = 'text-green-500';
    else if (synergisticLoad.score >= 50) scoreColorClass = 'text-yellow-500';

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-6 text-center">Ventana de Mando</h2>
            
            <div className="space-y-4">
                {/* Chronic Load */}
                <div className="bg-spartan-card p-4 rounded-lg text-center">
                    <h3 className="text-sm font-semibold text-spartan-text-secondary uppercase tracking-wider">Carga Crónica</h3>
                    <p className={`text-6xl font-bold ${scoreColorClass}`}>{synergisticLoad.score}</p>
                </div>

                {/* Justification */}
                <div className="bg-spartan-card p-4 rounded-lg text-center">
                     <p className="text-spartan-text-secondary italic">"{synergisticLoad.recommendation}"</p>
                </div>

                {/* Neuralgic Metrics */}
                <div className="grid grid-cols-2 gap-4">
                     <div className="bg-spartan-card p-4 rounded-lg text-center">
                        <h3 className="text-sm font-semibold text-spartan-text-secondary uppercase">Estrés</h3>
                        <p className="text-3xl font-bold">{stressLevel !== undefined ? `${stressLevel}/10` : 'N/A'}</p>
                    </div>
                     <div className="bg-spartan-card p-4 rounded-lg text-center">
                        <h3 className="text-sm font-semibold text-spartan-text-secondary uppercase">Sueño</h3>
                        <p className="text-3xl font-bold">{sleepQuality !== undefined ? `${sleepQuality}/10` : 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandCenterModal;
