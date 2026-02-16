import React from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import WorkoutCard from '../WorkoutCard.tsx';
import HabitTrackerCard from '../HabitTrackerCard.tsx';
import RecoveryDayCard from '../RecoveryDayCard.tsx';
import BrainIcon from '../icons/BrainIcon.tsx';
import DumbbellIcon from '../icons/DumbbellIcon.tsx';
import ZapIcon from '../icons/ZapIcon.tsx';
import CycleIcon from '../icons/CycleIcon.tsx';
import TargetIcon from '../icons/TargetIcon.tsx';
import LotusIcon from '../icons/LotusIcon.tsx';
import type { Trial, UserProfile, Routine, WorkoutHistory, DailyLog, HabitLog, ScheduledWorkout } from '../../types.ts';

// --- Components moved from Dashboard.tsx ---

const TrialCard: React.FC<{ trial: Trial; currentProgress: number }> = ({ trial, currentProgress }) => {
    const percentage = Math.min((currentProgress / trial.target) * 100, 100);
    const isCompleted = currentProgress >= trial.target;

    return (
        <div className={`p-4 rounded-lg flex flex-col gap-2 ${isCompleted ? 'bg-spartan-gold/20' : 'bg-spartan-card'}`}>
            <div>
                <h4 className="font-bold text-md text-spartan-gold">{trial.title}</h4>
            </div>
            <div>
                <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-semibold">{isCompleted ? '¡Completado!' : `${Math.floor(currentProgress).toLocaleString()} / ${trial.target.toLocaleString()} ${trial.unit}`}</span>
                    <span className="text-xs font-bold text-spartan-gold">{Math.floor(percentage)}%</span>
                </div>
                 <div className="w-full bg-spartan-surface rounded-full h-2">
                    <div className="bg-spartan-gold h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                </div>
            </div>
        </div>
    );
};

const TrainingCycleCard: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
    const { trainingCycle } = userProfile;

    if (!trainingCycle) return null;
    
    const phaseDetails = {
        adaptation: {
            title: "Adaptación Anatómica",
            description: "Construyendo una base sólida y perfeccionando la técnica.",
            icon: <BrainIcon className="w-6 h-6" />
        },
        hypertrophy: {
            title: "Hipertrofia",
            description: "Maximizando el volumen para estimular el crecimiento muscular.",
            icon: <DumbbellIcon className="w-6 h-6" />
        },
        strength: {
            title: "Fuerza Máxima",
            description: "Enfocado en levantamientos pesados para aumentar la fuerza neural.",
            icon: <ZapIcon className="w-6 h-6" />
        }
    }
    
    const details = phaseDetails[trainingCycle.phase];
    
    const startDate = new Date(trainingCycle.startDate);
    const today = new Date();
    const weeksElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;

    return (
        <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <CycleIcon className="w-6 h-6 text-spartan-gold" />
                Ciclo de Entrenamiento Actual
            </h2>
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-spartan-card rounded-full flex items-center justify-center text-spartan-gold flex-shrink-0">
                    {details.icon}
                </div>
                <div>
                    <p className="text-xs text-spartan-text-secondary">FASE ACTUAL (SEMANA {weeksElapsed})</p>
                    <h3 className="text-xl font-bold text-spartan-gold">{details.title}</h3>
                    <p className="text-sm text-spartan-text-secondary">{details.description}</p>
                </div>
            </div>
        </div>
    );
};

// --- Main Modal Component ---

interface DailySummaryModalProps {
    payload: {
        synergisticLoad: { score: number; recommendation: string };
        trialProgress: { [key: string]: number };
        userProfile: UserProfile;
        routines: Routine[];
        workoutHistory: WorkoutHistory[];
        dailyLogs: DailyLog[];
        habitLogs: HabitLog[];
        scheduledWorkouts: ScheduledWorkout[];
    }
}

const DailySummaryModal: React.FC<DailySummaryModalProps> = ({ payload }) => {
    const { hideModal } = useAppContext();
    const { synergisticLoad, trialProgress, userProfile, routines, scheduledWorkouts } = payload;
    
    const today = new Date().toISOString().split('T')[0];
    const todaysScheduledWorkout = scheduledWorkouts.find(sw => sw.date === today);
    const todayWorkout = todaysScheduledWorkout 
        ? routines.find(r => r.id === todaysScheduledWorkout.routineId) 
        : (routines.length > 0 ? routines[0] : null);

    const isRecoveryDay = synergisticLoad.score < 50;

    return (
        <div className="max-h-[85vh] overflow-y-auto pr-2 -mr-4">
            <h2 className="text-3xl font-bold text-spartan-gold mb-6">Resumen del Día</h2>
            <div className="space-y-8">
                {userProfile.trainingCycle && <TrainingCycleCard userProfile={userProfile} />}

                <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        {isRecoveryDay ? (
                            <>
                                <LotusIcon className="w-6 h-6 text-blue-400" />
                                Recomendación del Día
                            </>
                        ) : (
                            <>
                                <TargetIcon className="w-6 h-6 text-spartan-gold" />
                                Misión de Hoy
                            </>
                        )}
                    </h2>
                    {isRecoveryDay ? (
                        <RecoveryDayCard />
                    ) : (
                        todayWorkout ? (
                            <WorkoutCard routine={todayWorkout} />
                        ) : (
                            <div className="bg-spartan-card p-6 rounded-lg text-center">
                                <p className="text-spartan-text-secondary">No hay rutinas programadas. ¡Usa el creador de rutinas para empezar!</p>
                            </div>
                        )
                    )}
                </div>

                {userProfile.trials && userProfile.trials.length > 0 && (
                    <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold mb-4">Juicios Heroicos</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {userProfile.trials.map(trial => (
                                <TrialCard key={trial.id} trial={trial} currentProgress={trialProgress[trial.id] || 0} />
                            ))}
                        </div>
                    </div>
                )}
                
                {!userProfile.isInAutonomyPhase && userProfile.keystoneHabits.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Forja de Disciplina</h2>
                        <HabitTrackerCard />
                    </div>
                )}

                <div className="flex justify-end pt-4">
                     <button
                        onClick={hideModal}
                        className="py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DailySummaryModal;
