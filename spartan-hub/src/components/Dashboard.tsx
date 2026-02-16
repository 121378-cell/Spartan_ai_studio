import React, { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useSynergisticLoad } from '../hooks/useSynergisticLoad.ts';
import { useBurnoutPrediction } from '../hooks/useBurnoutPrediction.ts';
import { useMLForecasting } from '../hooks/useMLForecasting.ts';
import { useDevice } from '../context/DeviceContext.tsx';
import SynergisticLoadDial from './SynergisticLoadDial.tsx';
import WorkoutCard from './WorkoutCard.tsx';
import RecoveryDayCard from './RecoveryDayCard.tsx';
import HabitTrackerCard from './HabitTrackerCard.tsx';
import PropheticAlert from './PropheticAlert.tsx';
import CoachWidget from './CoachWidget.tsx';
import AlertManager from './AlertManager.tsx';
import SynergyIcon from './icons/SynergyIcon.tsx';
import TargetIcon from './icons/TargetIcon.tsx';
import LotusIcon from './icons/LotusIcon.tsx';
import CycleIcon from './icons/CycleIcon.tsx';
import CalendarIcon from './icons/CalendarIcon.tsx';
import TrophyIcon from './icons/TrophyIcon.tsx';
import ChartBarIcon from './icons/ChartBarIcon.tsx';
import ShieldIcon from './icons/ShieldIcon.tsx';
import AlertTriangleIcon from './icons/AlertTriangleIcon.tsx';
// import { ConnectGoogleFit } from './fitness/ConnectGoogleFit.tsx'; // Temporarily disabled - file excluded from build
import { DailyStatsCard } from './fitness/DailyStatsCard.tsx';
import BrainIcon from './icons/BrainIcon.tsx';
import DailyBriefingPlayer from './DailyBriefingPlayer.tsx';
import { useWearable } from '../context/WearableContext';
import { Heart } from 'lucide-react';

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

    const { deviceType, isMobile, isDesktop, densityFactor } = useDevice();
    const { lastHeartRate, status: wearableStatus } = useWearable();

    const synergisticLoad = useSynergisticLoad(workoutHistory, dailyLogs);
    const burnoutPrediction = useBurnoutPrediction(dailyLogs, habitLogs, userProfile.keystoneHabits);
    const { predictions } = useMLForecasting(userProfile.id);
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

    const handleShowTrainingRecommendations = () => {
        // Prepare training history and preferences from user data
        const trainingHistory = workoutHistory.map(wh => ({
            dayOfWeek: new Date(wh.date).toLocaleDateString('en-US', { weekday: 'long' }),
            type: wh.focus,
            duration: wh.durationMinutes,
            intensity: 7, // Default intensity (can be derived from data)
            focus: [wh.focus],
        }));

        const preferences = {
            preferredTypes: ['strength', 'cardio', 'hiit'],
            daysPerWeek: 5,
            targetIntensity: 7,
        };

        showModal('training-recommendations', {
            trainingHistory,
            preferences,
        }, { size: 'xl' });
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
    if (lastPlanDate) {
        const todayDate = new Date();
        const daysSincePlan = (todayDate.getTime() - lastPlanDate.getTime()) / (1000 * 3600 * 24);
        if (daysSincePlan < 7) {
            isWeeklyPlanDue = false;
        }
    }

    // Stats for quick overview
    const stats = [
        {
            title: 'Riesgo Lesión',
            value: predictions ? `${Math.round(predictions.injuryProbability.probabilityPercent)}%` : '---',
            unit: '',
            icon: <AlertTriangleIcon className={`w-6 h-6 ${predictions && predictions.injuryProbability.probabilityPercent > 50 ? 'text-red-500' : 'text-yellow-400'}`} />,
            change: predictions?.injuryProbability.recommendation.split(':')[0] || 'Analizando...'
        },
        {
            title: 'Nivel Fatiga',
            value: predictions ? `${Math.round(predictions.fatigueEstimate.fatigueLevel)}%` : '---',
            unit: '',
            icon: <LotusIcon className="w-6 h-6 text-blue-400" />,
            change: predictions ? `Recup: ${predictions.fatigueEstimate.estimatedRecoveryDays}d` : '---'
        },
        {
            title: 'Carga Sinérgica',
            value: synergisticLoad.score,
            unit: 'AU',
            icon: <ChartBarIcon className="w-6 h-6 text-blue-400" />,
            change: '+5% esta semana'
        },
        {
            title: 'Hábitos',
            value: userProfile.keystoneHabits.length,
            unit: '',
            icon: <ShieldIcon className="w-6 h-6 text-purple-400" />,
            change: `${userProfile.keystoneHabits.filter(h => h.currentStreak > 0).length} activos`
        },
        {
            title: 'Frecuencia Cardíaca',
            value: wearableStatus === 'connected' && lastHeartRate ? `${lastHeartRate.heartRate}` : '---',
            unit: 'BPM',
            icon: <Heart className={`w-6 h-6 ${wearableStatus === 'connected' ? 'text-red-500 fill-current' : 'text-spartan-text-secondary'}`} />,
            change: wearableStatus === 'connected' ? 'En vivo' : 'No conectado'
        }
    ];

    // Calculate responsive styles based on density factor
    const coachWidgetStyle = {
        padding: `${24 * densityFactor}px`,
        borderRadius: `${8 * densityFactor}px`,
    };

    const coachWidgetIconStyle = {
        width: `${24 * densityFactor}px`,
        height: `${24 * densityFactor}px`,
    };

    const headerStyle = {
        padding: `${16 * densityFactor}px`,
        gap: `${16 * densityFactor}px`,
    };

    return (
        <div className="animate-fadeIn space-y-6">
            {/* Header with responsive Coach Widget and Synergistic Heart */}
            <div className="dashboard-header" style={headerStyle}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="dashboard-welcome">Bienvenido, {userProfile.name}</h1>
                        <p className="dashboard-date">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>

                    {/* Responsive Coach Widget and Synergistic Heart */}
                    <div className={`flex items-center ${isMobile ? 'absolute top-4 right-4 z-10' : ''}`}>
                        {/* Synergistic Heart Icon */}
                        <div
                            className={`flex items-center justify-center rounded-full ${isMobile ? 'bg-spartan-primary p-2' : 'bg-spartan-surface p-3 mr-2'}`}
                            style={{
                                width: isMobile ? `${40 * densityFactor}px` : `${48 * densityFactor}px`,
                                height: isMobile ? `${40 * densityFactor}px` : `${48 * densityFactor}px`,
                            }}
                        >
                            <SynergyIcon
                                className={`${isMobile ? 'text-white' : 'text-spartan-gold'}`}
                                style={coachWidgetIconStyle}
                            />
                        </div>

                        {/* AI Form Analysis Button */}
                        <button
                            onClick={() => showModal('form-analysis', { exercise: 'squat' })}
                            className={`flex items-center justify-center rounded-xl bg-gradient-to-r from-spartan-primary to-spartan-primary-dark p-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-spartan-primary/20 ${isMobile ? 'mr-2' : 'ml-4 px-6'}`}
                        >
                            <BrainIcon className="w-5 h-5 text-white mr-2" />
                            {!isMobile && <span className="text-sm font-bold text-white">Análisis IA</span>}
                        </button>

                        {/* Training Recommendations Button */}
                        <button
                            onClick={handleShowTrainingRecommendations}
                            className={`flex items-center justify-center rounded-xl bg-gradient-to-r from-green-600 to-green-700 p-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/20 ${isMobile ? 'mr-2' : 'ml-4 px-6'}`}
                        >
                            <TargetIcon className="w-5 h-5 text-white mr-2" />
                            {!isMobile && <span className="text-sm font-bold text-white">Recomendaciones</span>}
                        </button>

                        {/* Coach Widget - Adjust size and position based on device */}
                        {!isMobile && (
                            <button
                                onClick={() => showModal('command-center')}
                                className="bg-spartan-surface p-4 rounded-xl shadow-lg hover:bg-spartan-border transition-all duration-300 transform hover:scale-105"
                                style={coachWidgetStyle}
                            >
                                <SynergisticLoadDial score={synergisticLoad.score} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <div key={index} className="spartan-card">
                        <div className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-spartan-text-secondary text-sm">{stat.title}</p>
                                    <p className="text-2xl font-bold mt-1">
                                        {stat.value} {stat.unit}
                                    </p>
                                </div>
                                <div className="p-2 bg-spartan-surface rounded-lg">
                                    {stat.icon}
                                </div>
                            </div>
                            <p className="text-xs text-spartan-text-secondary mt-2">{stat.change}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Alerts */}
            <AlertManager />

            {burnoutPrediction.isSignatureDetected && (
                <div className="spartan-alert spartan-alert-warning">
                    <div className="spartan-alert-icon">
                        <AlertTriangleIcon className="w-full h-full" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Alerta de Agotamiento</h3>
                        <p className="mt-1">{burnoutPrediction.reason}</p>
                        <button
                            onClick={handleShowPropheticIntervention}
                            className="mt-3 spartan-button spartan-button-secondary"
                        >
                            Tomar Medidas Preventivas
                        </button>
                    </div>
                </div>
            )}

            {predictions && predictions.injuryProbability.probabilityPercent > 70 && (
                <div className="spartan-alert spartan-alert-danger border-red-500 bg-red-500/10">
                    <div className="spartan-alert-icon text-red-500">
                        <AlertTriangleIcon className="w-full h-full" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-400">Riesgo Crítico de Lesión</h3>
                        <p className="mt-1 text-red-200/80">{predictions.injuryProbability.recommendation}</p>
                        <div className="mt-3 flex gap-3">
                            <button
                                onClick={() => showModal('form-analysis')}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <BrainIcon className="w-4 h-4" />
                                Analizar Técnica
                            </button>
                            <button
                                onClick={handleShowTrainingRecommendations}
                                className="bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
                            >
                                Ajustar Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCycleReviewDue && (
                <div className="spartan-alert spartan-alert-info">
                    <div className="spartan-alert-icon">
                        <CycleIcon className="w-full h-full text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-blue-300">Fin de Ciclo</h3>
                        <p className="mt-1 text-blue-200/80">Has completado 4 semanas en tu fase de {userProfile.trainingCycle?.phase}. Es hora de una revisión estratégica con tu coach.</p>
                        <button
                            onClick={handleShowCycleReview}
                            className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            Iniciar Revisión
                        </button>
                    </div>
                </div>
            )}

            {isWeeklyPlanDue && !isCycleReviewDue && (
                <div className="spartan-alert spartan-alert-info">
                    <div className="spartan-alert-icon">
                        <CalendarIcon className="w-full h-full text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-purple-300">Planificación Semanal</h3>
                        <p className="mt-1 text-purple-200/80">Es hora de planificar tu próxima semana de entrenamiento. Comprométete con tus días de entrenamiento para maximizar los resultados.</p>
                        <button
                            onClick={handleShowWeeklyPlanner}
                            className="mt-3 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            Planificar Semana
                        </button>
                    </div>
                </div>
            )}

            {/* Daily Briefing */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <DailyBriefingPlayer 
                        userId={userProfile.id}
                        onWatched={(briefingId) => console.log('Briefing watched:', briefingId)}
                        onRegenerate={() => console.log('Regenerating briefing...')}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="spartan-card">
                        <div className="spartan-card-header">
                            <h2 className="spartan-card-title flex items-center gap-2">
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
                        </div>
                        <div className="spartan-card-content">
                            {isRecoveryDay ? (
                                <RecoveryDayCard />
                            ) : (
                                todayWorkout ? (
                                    <WorkoutCard routine={todayWorkout} />
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-spartan-text-secondary">No hay rutina programada para hoy. Puedes empezar una desde la sección de Rutinas.</p>
                                        <button
                                            onClick={() => useAppContext().setCurrentPage('routines')}
                                            className="mt-4 spartan-button"
                                        >
                                            Ver Rutinas
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {!userProfile.isInAutonomyPhase && userProfile.keystoneHabits.length > 0 && (
                        <div className="spartan-card">
                            <div className="spartan-card-header">
                                <h2 className="spartan-card-title">Hábitos Clave</h2>
                            </div>
                            <div className="spartan-card-content">
                                <HabitTrackerCard />
                            </div>
                        </div>
                    )}
                </div>

                {/* Coach Widget for Desktop/Wide screens, hidden on Mobile */}
                {isDesktop && (
                    <div className="space-y-6">
                        {/* <ConnectGoogleFit /> */} {/* Temporarily disabled - file excluded from build */}
                        <DailyStatsCard />
                        <div className="spartan-card">
                            <div className="spartan-card-header">
                                <h2 className="spartan-card-title">Asistente de Entrenamiento</h2>
                            </div>
                            <div className="spartan-card-content">
                                <CoachWidget synergisticLoadScore={synergisticLoad.score} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Command Center Button for Mobile */}
            {isMobile && (
                <button
                    onClick={() => showModal('command-center')}
                    className="fixed bottom-6 right-6 bg-spartan-primary text-white p-4 rounded-full shadow-lg hover:bg-spartan-primary-dark transition-all duration-300 transform hover:scale-105 z-10"
                    style={{
                        width: `${56 * densityFactor}px`,
                        height: `${56 * densityFactor}px`,
                    }}
                >
                    <SynergisticLoadDial score={synergisticLoad.score} size={24 * densityFactor} />
                </button>
            )}
        </div>
    );
};

export default Dashboard;
