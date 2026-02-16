import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import RadarChart from './RadarChart.tsx';

const ProfileEvolution: React.FC = () => {
    const { userProfile, weeklyCheckIns } = useAppContext();
    const { evaluationData } = userProfile;

    if (!evaluationData) {
        return (
            <div>
                <h3 className="text-xl font-bold mb-4">Evolución del Perfil</h3>
                <div className="flex items-center justify-center h-64 bg-spartan-card rounded-lg">
                    <p className="text-spartan-text-secondary">Completa la evaluación para ver tu evolución.</p>
                </div>
            </div>
        );
    }

    // Calculate current stats from the last 4 check-ins if available
    const recentCheckIns = weeklyCheckIns.slice(-4);
    
    const initialStress = evaluationData.stressLevel;
    const initialEnergy = evaluationData.energyLevel;
    const initialConfidence = evaluationData.focusLevel; // Using focus as a proxy for confidence

    const currentStress = recentCheckIns.length > 0
        ? recentCheckIns.reduce((sum, ci) => sum + ci.perceivedStress, 0) / recentCheckIns.length
        : initialStress;
    
    const currentEnergy = recentCheckIns.length > 0
        ? recentCheckIns.reduce((sum, ci) => sum + ci.sleepQuality, 0) / recentCheckIns.length
        : initialEnergy;

    const avgHabitAdherence = recentCheckIns.length > 0
        ? recentCheckIns.reduce((sum, ci) => sum + ci.habitAdherence, 0) / recentCheckIns.length
        : 2.5;
    const currentConfidence = (avgHabitAdherence - 1) * 2.5;

    const labels = ['Estrés', 'Energía', 'Confianza'];
    const datasets = [
        {
            label: 'Inicial',
            data: [10 - initialStress, initialEnergy, initialConfidence],
            color: '#A0A0A0' // spartan-text-secondary
        },
        {
            label: 'Actual',
            data: [10 - currentStress, currentEnergy, currentConfidence],
            color: '#D4AF37' // spartan-gold
        }
    ];

    return (
        <div>
            <h3 className="text-xl font-bold mb-4">Evolución del Perfil</h3>
            <div className="flex flex-col items-center justify-center bg-spartan-card rounded-lg p-4">
                <RadarChart labels={labels} datasets={datasets} size={300} />
                 <div className="flex justify-center items-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#A0A0A0'}}></div>
                        <span className="text-sm">Inicial</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#D4AF37'}}></div>
                        <span className="text-sm">Actual</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileEvolution;
