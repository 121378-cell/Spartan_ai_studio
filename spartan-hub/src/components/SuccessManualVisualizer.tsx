import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import TrendingUpIcon from './icons/TrendingUpIcon.tsx';

const ProgressStatCard: React.FC<{ title: string; initial: number; current: number; unit: string; higherIsBetter?: boolean }> = ({ title, initial, current, unit, higherIsBetter = true }) => {
    const change = current - initial;
    const isImproved = higherIsBetter ? change > 0 : change < 0;
    const changeColor = isImproved ? 'text-green-400' : 'text-red-400';

    return (
        <div className="bg-spartan-card p-4 rounded-lg">
            <h4 className="text-md font-semibold text-spartan-text-secondary">{title}</h4>
            <div className="flex items-baseline justify-center gap-4 mt-2">
                <div className="text-center">
                    <p className="text-xs">INICIAL</p>
                    <p className="text-3xl font-bold">{initial.toFixed(0)}{unit}</p>
                </div>
                <TrendingUpIcon className={`w-8 h-8 ${changeColor}`} />
                 <div className="text-center">
                    <p className="text-xs">ACTUAL</p>
                    <p className="text-3xl font-bold">{current.toFixed(0)}{unit}</p>
                </div>
            </div>
        </div>
    );
};


const SuccessManualVisualizer: React.FC = () => {
    const { userProfile, weeklyCheckIns } = useAppContext();
    const { evaluationData } = userProfile;
    
    if (!evaluationData) {
        return null; // Don't render if onboarding isn't complete
    }

    // Calculate current stats from the last 4 check-ins if available
    const recentCheckIns = weeklyCheckIns.slice(-4);
    const avgStress = recentCheckIns.length > 0
        ? recentCheckIns.reduce((sum, ci) => sum + ci.perceivedStress, 0) / recentCheckIns.length
        : evaluationData.stressLevel;

    const avgHabitAdherence = recentCheckIns.length > 0
        ? recentCheckIns.reduce((sum, ci) => sum + ci.habitAdherence, 0) / recentCheckIns.length
        : 2.5; // Neutral start
    
    // Confidence is subjective, so we'll use a proxy. 
    // Let's map habit adherence (1-5) to a 0-10 scale.
    const currentConfidence = (avgHabitAdherence - 1) * 2.5;


    return (
        <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-spartan-gold mb-2">Visualización del Manual de Éxito</h2>
            <p className="text-spartan-text-secondary mb-6">
                Tu transformación, cuantificada. Compara tu estado inicial con tu 'yo' actual.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <ProgressStatCard 
                    title="Nivel de Estrés"
                    initial={evaluationData.stressLevel}
                    current={avgStress}
                    unit="/10"
                    higherIsBetter={false}
                 />
                 <ProgressStatCard 
                    title="Confianza / Disciplina"
                    initial={evaluationData.focusLevel} // Using focus as a proxy for initial confidence
                    current={currentConfidence}
                    unit="/10"
                    higherIsBetter={true}
                 />
            </div>
        </div>
    );
};

export default SuccessManualVisualizer;
