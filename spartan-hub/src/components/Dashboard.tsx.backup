import React, { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useSynergisticLoad } from '../hooks/useSynergisticLoad.ts';
import { useBurnoutPrediction } from '../hooks/useBurnoutPrediction.ts';
import SynergisticLoadDial from './SynergisticLoadDial.tsx';
import WorkoutCard from './WorkoutCard.tsx';
import RecoveryDayCard from './RecoveryDayCard.tsx';
import HabitTrackerCard from './HabitTrackerCard.tsx';
import PropheticAlert from './PropheticAlert.tsx';
import CoachWidget from './CoachWidget.tsx';
import TargetIcon from './icons/TargetIcon.tsx';
import LotusIcon from './icons/LotusIcon.tsx';
import CycleIcon from './icons/CycleIcon.tsx';
import CalendarIcon from './icons/CalendarIcon.tsx';

const Dashboard: React.FC = () => {
    const { 
        userProfile, 
        routines, 
        workoutHistory, 
        dailyLogs, 
        habitLogs, 
        showModal,
        scheduledWorkouts 
    } = useAppContext();
    const synergisticLoad = useSynergisticLoad(workoutHistory, dailyLogs);
    const burnoutPrediction = useBurnoutPrediction(dailyLogs, habitLogs, userProfile.keystoneHabits);
    const [showDailySummary, setShowDailySummary] = useState(false);

    // FUI1: Daily Summary on first load
    useEffect(() => {
        const lastShown = localStorage.getItem('dailySummaryLastShown');
        const today = new Date().toISOString().split('T')[0];
        if (lastShown !== today) {
            setShowDailySummary(true);
            localStorage.setItem('dailySummaryLastShown', today);
        }
    }, []);

    const trialProgress = useMemo(() => {
        const progress: { [key: string]: number } = {};
        if (!userProfile.trials) return progress;

        const totalWeight = workoutHistory.reduce((sum, wh) => sum + wh.totalWeightLifted, 0);
        const totalWorkouts = userProfile.stats.totalWorkouts;
        const currentStreak = userProfile.stats.currentStreak;

        userProfile.trials.forEach(trial => {
            if (trial.unit === 'kg') progress[trial.id] = totalWeight;
            if (trial.unit === 'workouts') progress[trial.id] = totalWorkouts;
            if (trial.unit === 'days') progress[trial.id] = currentStreak;
        });
        return progress;
    }, [userProfile.trials, userProfile.stats, workoutHistory]);

    useEffect(() => {
        if (showDailySummary) {
            showModal('daily-summary', {
                synergisticLoad,
                trialProgress,
                userProfile,
                routines,
                workoutHistory,
                dailyLogs,
                habitLogs,
                scheduledWorkouts
            }, { size: 'large' });
            setShowDailySummary(false); // Prevent re-opening on hot-reload
        }
    }, [showDailySummary, showModal, synergisticLoad, trialProgress, userProfile, routines, workoutHistory, dailyLogs, habitLogs, scheduledWorkouts]);


    const handleShowPropheticIntervention = () => {
        showModal('prophetic-intervention', { reason: burnoutPrediction.reason });
    };

    const handleShowCycleReview = () => {
        showModal('new-training-cycle', {}, { size: 'xl' });
    }
    
    const handleShowWeeklyPlanner = () => {
        showModal('weekly-planner', {}, { size: 'large' });
    }

    const today = new Date().toISOString().split('T')[0];
    const todaysScheduledWorkout = scheduledWorkouts.find(sw => sw.date === today);
    const todayWorkout = todaysScheduledWorkout 
        ? routines.find(r => r.id === todaysScheduledWorkout.routineId) 
        : (routines.length > 0 ? routines[0] : null);

    const isRecoveryDay = synergisticLoad.level === 'recovery';

    const cycleStartDate = userProfile.trainingCycle?.startDate ? new Date(userProfile.trainingCycle.startDate) : null;
    let isCycleReviewDue = false;
    if (cycleStartDate) {
        const todayDate = new Date();
        const daysSinceStart = (todayDate.getTime() - cycleStartDate.getTime()) / (1000 * 3600 * 24);
        if (daysSinceStart >= 28) {
            isCycleReviewDue = true;
        }
    }
    
    const lastPlanDate = userProfile.lastWeeklyPlanDate ? new Date(userProfile.lastWeeklyPlanDate) : null;
    let isWeeklyPlanDue = true;
    if(lastPlanDate){
        const todayDate = new Date();
        const daysSincePlan = (todayDate.getTime() - lastPlanDate.getTime()) / (1000 * 3600 * 24);
        if(daysSincePlan < 7) {
            isWeeklyPlanDue = false;
        }
    }


    return (
        <div className="animate-fadeIn space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-bold">Bienvenido, {userProfile.name}</h1>
                    <p className="text-lg text-spartan-text-secondary">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                 <button onClick={() => showModal('command-center')} className="bg-spartan-surface p-4 rounded-lg shadow-sm hover:bg-spartan-border transition-colors">
                    <SynergisticLoadDial score={synergisticLoad.score} />
                </button>
            </div>
            
            {burnoutPrediction.isSignatureDetected && (
                <PropheticAlert reason={burnoutPrediction.reason || ''} onAcknowledge={handleShowPropheticIntervention} />
            )}

            {isCycleReviewDue && (
                 <div className="bg-blue-900/50 border-2 border-blue-400 p-6 rounded-lg shadow-lg flex flex-col md:flex-row items-center gap-6">
                    <CycleIcon className="w-16 h-16 text-blue-400" />
                    <div className="flex-grow text-center md:text-left">
                        <h3 className="text-2xl font-bold text-blue-300">Fin de Ciclo</h3>
                        <p className="text-blue-200/80 mt-2">Has completado 4 semanas en tu fase de {userProfile.trainingCycle?.phase}. Es hora de una revisión estratégica con tu coach.</p>
                    </div>
                    <button onClick={handleShowCycleReview} className="bg-spartan-card text-spartan-text font-bold py-3 px-6 rounded-lg hover:bg-spartan-border">Iniciar Revisión</button>
                </div>
            )}
            
            {isWeeklyPlanDue && !isCycleReviewDue && (
                 <div className="bg-purple-900/50 border-2 border-purple-400 p-6 rounded-lg shadow-lg flex flex-col md:flex-row items-center gap-6">
                    <CalendarIcon className="w-16 h-16 text-purple-400" />
                    <div className="flex-grow text-center md:text-left">
                        <h3 className="text-2xl font-bold text-purple-300">Planificación Semanal</h3>
                        <p className="text-purple-200/80 mt-2">Es hora de planificar tu próxima semana de entrenamiento. Comprométete con tus días de entrenamiento para maximizar los resultados.</p>
                    </div>
                    <button onClick={handleShowWeeklyPlanner} className="bg-spartan-card text-spartan-text font-bold py-3 px-6 rounded-lg hover:bg-spartan-border">Planificar Semana</button>
                </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
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
                                    <p className="text-spartan-text-secondary">No hay rutina programada para hoy. Puedes empezar una desde la sección de Rutinas.</p>
                                </div>
                            )
                        )}
                    </div>
                     {!userProfile.isInAutonomyPhase && userProfile.keystoneHabits.length > 0 && <HabitTrackerCard />}
                </div>
                <div className="space-y-8">
                   <CoachWidget synergisticLoadScore={synergisticLoad.score} />
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
