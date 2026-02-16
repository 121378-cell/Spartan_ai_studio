import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { produce } from 'immer';
import { logger } from '../utils/logger';
import type {
    Page,
    UserProfile,
    Routine,
    WorkoutSession,
    ModalState,
    ToastState,
    SetProgress,
    AiResponse,
    ChatMessage,
    ReconditioningPlan,
    EvaluationFormData,
    Milestone,
    MasterRegulationSettings,
    DailyLog,
    KeystoneHabit,
    HabitLog,
    WeeklyCheckIn,
    ExerciseProgress,
    WorkoutHistory,
    ProgressionOverride,
    MobilityIssue,
    NutritionSettings,
    TrainingCycle,
    Exercise,
    ChronotypeAnalysis,
    JournalEntry,
    ModalPosition,
    ModalSize,
    ScheduledWorkout
} from '../types';
import { InitialPlanResponse, getWeeklyCheckInFeedback, getSuccessManual, getFailureReframing, getPeriodizationGuardFeedback, recalculateScheduleForInterruption, compensateForSkippedWorkout, adjustRoutineForTime } from '../services/aiService';
import { adaptRoutineForInjuries } from '../utils/routineAdapter';
import { MOBILITY_DRILLS, EXERCISE_MOBILITY_MAP } from '../data/mobilityLibrary';
import { PersistenceService } from '../services/persistenceService';


// --- DEFAULT STATE & MOCK DATA ---
const defaultUserProfile: UserProfile = {
    id: 'default-user-id',
    name: 'Spartan',
    email: 'spartan@synergy.ai',
    quest: '',
    stats: {
        totalWorkouts: 0,
        currentStreak: 0,
        joinDate: new Date().toLocaleDateString(),
    },
    trials: [
        { id: 't1', title: 'El Desafío de Heracles', description: 'Levanta un total acumulado de 1,000,000 kg.', target: 1000000, unit: 'kg' },
        { id: 't2', title: 'La Marcha de los 300', description: 'Completa 300 entrenamientos.', target: 300, unit: 'workouts' },
        { id: 't3', title: 'La Llama Eterna', description: 'Mantén una racha de entrenamiento de 90 días.', target: 90, unit: 'days' },
    ],
    onboardingCompleted: true,
    keystoneHabits: [],
    reflections: [],
    journal: [],
    masterRegulationSettings: { targetBedtime: '22:30' },
    nutritionSettings: {
        priority: 'performance',
        calorieGoal: 2800,
        proteinGoal: 180,
    },
    milestones: [],
    isInAutonomyPhase: false,
    progressionOverrides: {},
    trainingCycle: undefined,
    activeMobilityIssues: [],
};

// --- CONTEXT TYPE DEFINITION ---
interface AppContextType {
    // State
    currentPage: Page;
    userProfile: UserProfile;
    routines: Routine[];
    workoutHistory: WorkoutHistory[];
    activeSession: WorkoutSession | null;
    isChatOpen: boolean;
    modal: ModalState;
    toast: ToastState;
    reconditioningPlans: ReconditioningPlan[];
    dailyLogs: DailyLog[];
    habitLogs: HabitLog[];
    weeklyCheckIns: WeeklyCheckIn[];
    scheduledWorkouts: ScheduledWorkout[];
    isPreWorkoutActive: boolean;
    pendingWorkoutRoutine: Routine | null;
    isFocusSessionActive: boolean;

    // Actions
    setCurrentPage: (page: Page) => void;
    updateProfile: (updates: Partial<UserProfile>) => void;
    addRoutine: (newRoutine: Omit<Routine, 'id'>) => void;
    startWorkout: (routine: Routine, bypassCortisolCheck?: boolean) => void;
    proceedToSession: () => void;
    endWorkout: () => void;
    updateSetProgress: (blockIndex: number, exerciseIndex: number, setIndex: number, updates: Partial<SetProgress>) => void;
    toggleChat: () => void;
    showModal: (type: string, payload?: any, options?: { size?: ModalSize, position?: ModalPosition, isCritical?: boolean }) => void;
    hideModal: () => void;
    showToast: (message: string) => void;
    handleAiResponse: (response: AiResponse) => void;
    logUserFeedback: (aiMessage: ChatMessage, userMessage: ChatMessage, feedback: 'good' | 'bad') => void;
    requestAiRoutineSuggestion: () => void;
    addReconditioningPlan: (newPlan: Omit<ReconditioningPlan, 'id'>) => void;
    requestAiReconditioningPlanSuggestion: () => void;
    saveWeeklySchedule: (schedule: ScheduledWorkout[]) => void;
    rescheduleWorkout: (sourceDate: string, targetDate: string) => void;
    reportTrainingInterruption: (routineId: string, date: string) => void;
    recalculateSchedule: (interruptedRoutineId: string, interruptedDate: string) => Promise<void>;
    compensateSchedule: (skippedRoutineId: string, skippedDate: string) => Promise<void>;
    completeOnboarding: (name: string, formData: EvaluationFormData, initialPlan: InitialPlanResponse, failedMobilityIssues: MobilityIssue[]) => void;
    startNewCycle: (newRoutine: Omit<Routine, 'id'>, newPhase: TrainingCycle['phase']) => void;
    extendCurrentCycle: () => void;
    updateQuestAndMilestones: (quest: string, milestones: Omit<Milestone, 'id' | 'isCompleted'>[]) => void;
    addReflection: (text: string) => void;
    logHabitCompletion: (habitId: string) => void;
    addKeystoneHabit: (habit: Omit<KeystoneHabit, 'id' | 'currentStreak' | 'longestStreak'>) => void;
    updateMasterRegulationSettings: (settings: MasterRegulationSettings) => void;
    updateNutritionSettings: (settings: NutritionSettings) => void;
    addOrUpdateDailyLog: (log: Omit<DailyLog, 'date'> & { date: string }) => Promise<void>;
    addWeeklyCheckIn: (checkIn: Omit<WeeklyCheckIn, 'date'>) => void;
    requestSuccessManual: () => void;
    completeMobilityAssessment: (failedIssues: MobilityIssue[]) => void;
    saveChronotypeAnalysis: (analysis: ChronotypeAnalysis) => void;
    startFocusSession: () => void;
    endFocusSession: () => void;
    setPendingWorkoutRoutine: (routine: Routine | null) => void;
    adjustPendingWorkout: (routine: Routine, availableTime: number) => Promise<void>;
}

// --- CONTEXT CREATION ---
export const AppContext = createContext<AppContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Helper for localStorage
    const getStoredState = <T,>(key: string, defaultValue: T): T => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    };

    // State Hooks
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [userProfile, setUserProfile] = useState<UserProfile>(() => getStoredState('userProfile', defaultUserProfile));
    const [routines, setRoutines] = useState<Routine[]>(() => getStoredState('routines', []));
    const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistory[]>(() => getStoredState('workoutHistory', []));
    const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: null, payload: {} });
    const [toast, setToast] = useState<ToastState>({ isVisible: false, message: '' });
    const [reconditioningPlans, setReconditioningPlans] = useState<ReconditioningPlan[]>(() => getStoredState('reconditioningPlans', []));
    const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() => getStoredState('dailyLogs', []));
    const [habitLogs, setHabitLogs] = useState<HabitLog[]>(() => getStoredState('habitLogs', []));
    const [weeklyCheckIns, setWeeklyCheckIns] = useState<WeeklyCheckIn[]>(() => getStoredState('weeklyCheckIns', []));
    const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>(() => getStoredState('scheduledWorkouts', []));
    const [isPreWorkoutActive, setIsPreWorkoutActive] = useState(false);
    const [pendingWorkoutRoutine, setPendingWorkoutRoutine] = useState<Routine | null>(null);
    const [isFocusSessionActive, setIsFocusSessionActive] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);


    // Persist state to localStorage with enhanced persistence
    useEffect(() => {
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        // Save critical user profile data for offline access
        PersistenceService.saveCriticalData('userProfile', userProfile);
    }, [userProfile]);

    useEffect(() => {
        localStorage.setItem('routines', JSON.stringify(routines));
        // Save last loaded routine for offline access
        if (routines.length > 0) {
            PersistenceService.saveLastLoadedRoutine(routines[routines.length - 1]);
        }
    }, [routines]);

    useEffect(() => {
        localStorage.setItem('workoutHistory', JSON.stringify(workoutHistory));
        // Save critical workout history data
        PersistenceService.saveCriticalData('workoutHistory', workoutHistory);
    }, [workoutHistory]);

    useEffect(() => {
        localStorage.setItem('reconditioningPlans', JSON.stringify(reconditioningPlans));
        // Save critical reconditioning plans
        PersistenceService.saveCriticalData('reconditioningPlans', reconditioningPlans);
    }, [reconditioningPlans]);

    useEffect(() => {
        localStorage.setItem('dailyLogs', JSON.stringify(dailyLogs));
        // Save critical daily logs
        PersistenceService.saveCriticalData('dailyLogs', dailyLogs);
    }, [dailyLogs]);

    useEffect(() => {
        localStorage.setItem('habitLogs', JSON.stringify(habitLogs));
        // Save critical habit logs
        PersistenceService.saveCriticalData('habitLogs', habitLogs);
    }, [habitLogs]);

    useEffect(() => {
        localStorage.setItem('weeklyCheckIns', JSON.stringify(weeklyCheckIns));
        // Save critical weekly check-ins
        PersistenceService.saveCriticalData('weeklyCheckIns', weeklyCheckIns);
    }, [weeklyCheckIns]);

    useEffect(() => {
        localStorage.setItem('scheduledWorkouts', JSON.stringify(scheduledWorkouts));
        // Save critical scheduled workouts
        PersistenceService.saveCriticalData('scheduledWorkouts', scheduledWorkouts);
    }, [scheduledWorkouts]);

    // Toast logic
    const showToast = useCallback((message: string) => {
        setToast({ message, isVisible: true });
        setTimeout(() => setToast({ message: '', isVisible: false }), 4000);
    }, []);

    // Modal logic
    const showModal = (type: string, payload: any = {}, options: { size?: ModalSize, position?: ModalPosition, isCritical?: boolean } = {}) => {
        setModal({
            isOpen: true,
            type,
            payload,
            size: options.size || 'default',
            position: options.position || 'center',
            isCritical: options.isCritical || false
        });
    };
    const hideModal = () => setModal({ isOpen: false, type: null, payload: {} });

    // Profile logic
    const updateProfile = (updates: Partial<UserProfile>) => {
        setUserProfile(prev => ({ ...prev, ...updates }));
    };

    const updateProgressionOverrides = (routineId: string, exerciseName: string, newWeight: number) => {
        setUserProfile(prev => {
            const newOverrides = { ...(prev.progressionOverrides || {}) };
            if (!newOverrides[routineId]) {
                newOverrides[routineId] = {};
            }
            newOverrides[routineId][exerciseName] = { recommendedWeight: newWeight };
            return { ...prev, progressionOverrides: newOverrides };
        });
    };

    const toggleChat = () => setIsChatOpen(prev => !prev);

    // Routine logic
    const addRoutine = (newRoutineData: Omit<Routine, 'id'>) => {
        const injuryHistory = userProfile.evaluationData?.history || '';
        const adaptedRoutineData = adaptRoutineForInjuries(newRoutineData, injuryHistory);
        if (JSON.stringify(newRoutineData) !== JSON.stringify(adaptedRoutineData)) {
            showToast("Se han modificado ejercicios para adaptarlos a tu historial de lesiones.");
        }

        const routineWithId: Routine = { ...adaptedRoutineData, id: `r-${Date.now()}` };
        setRoutines(prev => [routineWithId, ...prev]);
    };

    const addReconditioningPlan = (newPlan: Omit<ReconditioningPlan, 'id'>) => {
        const planWithId: ReconditioningPlan = { ...newPlan, id: `rcp-${Date.now()}` };
        setReconditioningPlans(prev => [planWithId, ...prev]);
    }

    const requestAiRoutineSuggestion = () => {
        handleAiResponse({
            type: 'response',
            message: 'Claro, ¿qué tipo de rutina tienes en mente? Puedes describirla o pedirme que abra el creador de rutinas.',
            action: { name: 'openModal', payload: { modalName: 'smart-routine-creator' } }
        });
        toggleChat();
    };

    const requestAiReconditioningPlanSuggestion = () => {
        handleAiResponse({
            type: 'response',
            message: "Entendido. La recuperación es clave. ¿Qué necesitas? ¿Algo para el dolor muscular, para la fatiga mental, o una mezcla de ambos?",
        });
        toggleChat();
    };

    const saveWeeklySchedule = (schedule: ScheduledWorkout[]) => {
        const today = new Date().toISOString().split('T')[0];
        setScheduledWorkouts(schedule);
        if (schedule.length > 0) { // Only update date if we are actually saving a schedule
            updateProfile({ lastWeeklyPlanDate: today });
        }
    };

    const rescheduleWorkout = async (sourceDate: string, targetDate: string) => {
        const performReschedule = () => {
            const sourceWorkoutIndex = scheduledWorkouts.findIndex(w => w.date === sourceDate);
            const targetWorkoutIndex = scheduledWorkouts.findIndex(w => w.date === targetDate);

            const newSchedule = produce(scheduledWorkouts, draft => {
                if (sourceWorkoutIndex === -1) return;

                if (targetWorkoutIndex === -1) { // Moving to an empty day
                    draft[sourceWorkoutIndex].date = targetDate;
                } else { // Swapping with another workout
                    [draft[sourceWorkoutIndex].date, draft[targetWorkoutIndex].date] = [draft[targetWorkoutIndex].date, draft[sourceWorkoutIndex].date];
                }
            });

            saveWeeklySchedule(newSchedule);
            showToast("Calendario actualizado.");
        };

        const sourceWorkout = scheduledWorkouts.find(w => w.date === sourceDate);
        if (!sourceWorkout) return;

        const routine = routines.find(r => r.id === sourceWorkout.routineId);
        if (!routine) return;

        const scheduleContext = scheduledWorkouts.map(sw => {
            const r = routines.find(r => r.id === sw.routineId);
            return { date: sw.date, focus: r?.focus || 'Desconocido' };
        });

        showToast("Consultando al Coach...");
        const warning = await getPeriodizationGuardFeedback(scheduleContext, { date: sourceDate, focus: routine.focus }, targetDate);

        if (warning) {
            showModal('reschedule-confirmation', { warning, onConfirm: performReschedule });
        } else {
            performReschedule();
        }
    };

    const reportTrainingInterruption = (routineId: string, date: string) => {
        showModal('logistics-intervention', { routineId, date }, { isCritical: true });
    };

    const recalculateSchedule = async (interruptedRoutineId: string, interruptedDate: string) => {
        showToast("Reestructurando la partitura...");
        const result = await recalculateScheduleForInterruption(scheduledWorkouts, routines, interruptedDate);
        if (result && result.newSchedule && result.notification) {
            saveWeeklySchedule(result.newSchedule);
            showToast(result.notification);
        } else {
            showToast("La IA no pudo reestructurar el horario. Inténtalo de nuevo.");
        }
    };

    const compensateSchedule = async (skippedRoutineId: string, skippedDate: string) => {
        showToast("Calculando compensación de carga...");
        const skippedRoutine = routines.find(r => r.id === skippedRoutineId);
        if (!skippedRoutine) {
            showToast("Error: No se encontró la rutina omitida.");
            return;
        }

        const upcomingWorkouts = scheduledWorkouts
            .filter(sw => new Date(sw.date) > new Date(skippedDate))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const nextWorkout = upcomingWorkouts[0];
        if (!nextWorkout) {
            showToast("No hay entrenamientos próximos para compensar.");
            const newSchedule = scheduledWorkouts.filter(sw => sw.date !== skippedDate);
            saveWeeklySchedule(newSchedule);
            return;
        }

        const nextRoutine = routines.find(r => r.id === nextWorkout.routineId);
        if (!nextRoutine) {
            showToast("Error: No se encontró la próxima rutina.");
            return;
        }

        const compensatedRoutineData = await compensateForSkippedWorkout(skippedRoutine, nextRoutine);
        if (compensatedRoutineData) {
            const newCompensatedRoutine: Routine = { ...compensatedRoutineData, id: `comp-${Date.now()}` };
            setRoutines(prev => [...prev, newCompensatedRoutine]);

            const newSchedule = produce(scheduledWorkouts, draft => {
                const skippedIndex = draft.findIndex(sw => sw.date === skippedDate);
                if (skippedIndex > -1) {
                    draft.splice(skippedIndex, 1);
                }
                const nextWorkoutIndex = draft.findIndex(sw => sw.date === nextWorkout.date);
                if (nextWorkoutIndex > -1) {
                    draft[nextWorkoutIndex].routineId = newCompensatedRoutine.id;
                }
            });
            saveWeeklySchedule(newSchedule);
            showToast("Carga compensada en tu próxima sesión.");
        } else {
            showToast("La IA no pudo compensar la sesión. Se omitirá.");
            const newSchedule = scheduledWorkouts.filter(sw => sw.date !== skippedDate);
            saveWeeklySchedule(newSchedule);
        }
    };


    // Workout session logic
    const startWorkout = (routine: Routine, bypassCortisolCheck: boolean = false) => {

        // --- Protocol 3: Cortisol Shield (Hormonal Optimization) ---
        if (!bypassCortisolCheck) {
            const isHighIntensity = /hiit|metabólico|asalto|resistencia/i.test(routine.focus);
            const targetBedtime = userProfile.masterRegulationSettings?.targetBedtime;

            if (isHighIntensity && targetBedtime) {
                const now = new Date();
                const [hours, minutes] = targetBedtime.split(':').map(Number);
                const bedtime = new Date();
                bedtime.setHours(hours, minutes, 0, 0);

                // If bedtime is in the past (e.g., it's 1 AM, bedtime was 10 PM), add a day.
                if (bedtime < now) {
                    bedtime.setDate(bedtime.getDate() + 1);
                }

                const hoursBeforeBed = (bedtime.getTime() - now.getTime()) / (1000 * 60 * 60);

                if (hoursBeforeBed > 0 && hoursBeforeBed < 4) { // 4-hour window
                    showModal('cortisol-shield', { routine, hoursBeforeBed: hoursBeforeBed.toFixed(1) });
                    return; // Stop execution, let the modal handle the decision
                }
            }
        }

        setPendingWorkoutRoutine(routine);
        setIsPreWorkoutActive(true);
    };

    const adjustPendingWorkout = async (routine: Routine, availableTime: number) => {
        showToast("Consultando al estratega...");
        const adjustedRoutineData = await adjustRoutineForTime(routine, availableTime);

        if (adjustedRoutineData) {
            const finalAdjustedRoutine: Routine = { ...adjustedRoutineData, id: `adj-${Date.now()}` };

            const justificationMatch = finalAdjustedRoutine.objective?.match(/(Hemos priorizado.*)/);
            const justification = justificationMatch ? justificationMatch[1] : "Rutina ajustada para tu tiempo disponible.";

            setPendingWorkoutRoutine(finalAdjustedRoutine);
            hideModal();
            showToast(justification);
        } else {
            showToast("La IA no pudo ajustar la rutina. Por favor, inténtalo de nuevo.");
            // We don't hide modal on error, so user can retry or cancel.
        }
    };

    const proceedToSession = () => {
        if (!pendingWorkoutRoutine) return;

        let sessionRoutine = produce(pendingWorkoutRoutine, draft => { }); // Start with a clean copy
        const adaptationMessages: string[] = [];

        // --- Protocol 1: Anti-Overload (based on recovery) ---
        const today = new Date().toISOString().split('T')[0];
        const todayLog = dailyLogs.find(log => log.date === today);

        if (todayLog && todayLog.recovery <= 2) {
            const mainLiftKeywords = ['sentadilla', 'press', 'peso muerto', 'remo', 'banca', 'dominada', 'fondos'];
            let wasAdapted = false;

            sessionRoutine = produce(sessionRoutine, draft => {
                draft.blocks.forEach(block => {
                    const originalExerciseCount = block.exercises.length;
                    // Filter exercises, keeping only those that are main lifts or warm-ups
                    block.exercises = block.exercises.filter(ex =>
                        mainLiftKeywords.some(keyword => ex.name.toLowerCase().includes(keyword))
                    );
                    if (block.exercises.length < originalExerciseCount) {
                        wasAdapted = true;
                    }
                });
                draft.blocks = draft.blocks.filter(block => block.exercises.length > 0);
            });

            if (wasAdapted) {
                sessionRoutine.name = `${sessionRoutine.name} (Protocolo Anti-Sobrecarga)`;
                adaptationMessages.push("Recuperación baja detectada. Se ha activado el Protocolo Anti-Sobrecarga, reduciendo el volumen para priorizar la fuerza.");
            }
        }

        // --- Protocol 2: Connective Tissue Diet (Targeted Mobility) ---
        const activeIssues = userProfile.activeMobilityIssues || [];
        if (activeIssues.length > 0) {
            const issuesInRoutine = new Set<MobilityIssue>();

            sessionRoutine.blocks.forEach(block => {
                block.exercises.forEach(ex => {
                    const exNameLower = ex.name.toLowerCase();
                    for (const [keyword, requiredMobilities] of Object.entries(EXERCISE_MOBILITY_MAP)) {
                        if (exNameLower.includes(keyword)) {
                            requiredMobilities.forEach(mob => {
                                if (activeIssues.includes(mob)) {
                                    issuesInRoutine.add(mob);
                                }
                            });
                        }
                    }
                });
            });

            if (issuesInRoutine.size > 0) {
                const uniqueIssues = Array.from(issuesInRoutine);
                const drillsToInject: Exercise[] = MOBILITY_DRILLS
                    .filter(drill => uniqueIssues.some(issue => drill.addresses.includes(issue)))
                    .filter((drill, index, self) => index === self.findIndex(d => d.id === drill.id))
                    .map(drill => ({
                        name: drill.name,
                        sets: 1,
                        reps: drill.description,
                        rir: undefined,
                        restSeconds: 20,
                        coachTip: 'Enfócate en el control y el rango de movimiento.'
                    }));

                if (drillsToInject.length > 0) {
                    sessionRoutine = produce(sessionRoutine, draft => {
                        if (draft.blocks.length > 0 && draft.blocks[0].name.toLowerCase().includes('calentamiento')) {
                            draft.blocks[0].exercises.unshift(...drillsToInject);
                        } else {
                            draft.blocks.unshift({ name: "Calentamiento de Movilidad Específico", exercises: drillsToInject });
                        }
                    });
                    adaptationMessages.push(`Calentamiento adaptado con ejercicios de movilidad para: ${uniqueIssues.join(', ')}.`);
                }
            }
        }

        if (adaptationMessages.length > 0) {
            showToast(adaptationMessages.join(' '));
        }

        const routineOverrides = userProfile.progressionOverrides?.[sessionRoutine.id] || {};

        const progress: ExerciseProgress[][] = sessionRoutine.blocks.map(block =>
            block.exercises.map(ex => {
                const recommendedWeight = routineOverrides[ex.name]?.recommendedWeight;
                return {
                    sets: Array(ex.sets).fill(null).map(() => ({
                        weight: recommendedWeight ? String(recommendedWeight) : '',
                        reps: '',
                        rir: undefined,
                        completed: false
                    }))
                };
            })
        );
        setActiveSession({ routine: sessionRoutine, progress, startTime: Date.now() });
        setIsPreWorkoutActive(false);
        setPendingWorkoutRoutine(null);
        setCurrentPage('session');
    };


    const endWorkout = () => {
        if (!activeSession) return;

        const durationMinutes = Math.round((Date.now() - activeSession.startTime) / 60000);
        const totalWeightLifted = activeSession.progress.flat().flatMap(ex => ex.sets)
            .reduce((sum, set) => sum + (parseFloat(set.weight || '0') * parseInt(set.reps || '0')), 0);

        const newHistoryEntry: WorkoutHistory = {
            id: `wh-${Date.now()}`,
            routineName: activeSession.routine.name,
            date: new Date().toISOString().split('T')[0],
            durationMinutes,
            totalWeightLifted,
            focus: activeSession.routine.focus,
        };

        setWorkoutHistory(prev => [newHistoryEntry, ...prev]);
        setUserProfile(prev => ({
            ...prev,
            stats: { ...prev.stats, totalWorkouts: prev.stats.totalWorkouts + 1 }
        }));

        // Double Progression Logic
        const progressions: { exerciseName: string; newWeight: number }[] = [];
        const { routine, progress } = activeSession;

        routine.blocks.forEach((block, blockIndex) => {
            block.exercises.forEach((exercise, exerciseIndex) => {
                const repRange = exercise.reps.split('-').map(r => parseInt(r.trim()));
                const repMax = repRange.length > 1 ? repRange[1] : repRange[0];

                if (!repMax) return;

                let shouldProgress = false;
                let lastWeight = 0;

                progress[blockIndex][exerciseIndex].sets.forEach(set => {
                    if (set.completed && parseInt(set.reps) >= repMax && parseFloat(set.weight) > 0) {
                        shouldProgress = true;
                        lastWeight = parseFloat(set.weight);
                    }
                });

                if (shouldProgress) {
                    const newRecommendedWeight = lastWeight + 2.5; // Simple 2.5kg increment
                    updateProgressionOverrides(routine.id, exercise.name, newRecommendedWeight);
                    progressions.push({ exerciseName: exercise.name, newWeight: newRecommendedWeight });
                }
            });
        });

        showModal('workout-summary', {
            name: activeSession.routine.name,
            duration: durationMinutes,
            volume: totalWeightLifted,
            progressions
        });

        setActiveSession(null);
        setCurrentPage('dashboard');
    };

    const updateSetProgress = (blockIndex: number, exerciseIndex: number, setIndex: number, updates: Partial<SetProgress>) => {
        if (!activeSession) return;
        const newProgress = [...activeSession.progress];
        const newSet = { ...newProgress[blockIndex][exerciseIndex].sets[setIndex], ...updates };
        newProgress[blockIndex][exerciseIndex].sets[setIndex] = newSet;
        setActiveSession({ ...activeSession, progress: newProgress });
    };

    // AI Response Handling
    const handleAiResponse = useCallback((response: AiResponse | null) => {
        if (!response) {
            showToast("Hubo un error con la respuesta de la IA.");
            return;
        }

        if (response.feedback) {
            showToast(response.feedback);
        }

        if (response.type === 'action' && response.action) {
            const { name, payload } = response.action;
            switch (name) {
                case 'addRoutine':
                    if (payload.routine) addRoutine(payload.routine);
                    break;
                case 'addReconditioningPlan':
                    if (payload.plan) addReconditioningPlan(payload.plan);
                    break;
                case 'openModal':
                    if (payload.modalName) showModal(payload.modalName);
                    break;
                default:
                    logger.warn(`Acción de IA desconocida: ${name}`);
            }
        }
    }, [showToast]);

    const logUserFeedback = (aiMessage: ChatMessage, userMessage: ChatMessage, feedback: 'good' | 'bad') => {
        logger.info('User feedback logged', {
            metadata: {
                feedback,
                userQuery: userMessage.text,
                aiResponse: aiMessage.text,
            }
        });
        showToast("¡Gracias por tu feedback!");
    };

    // Onboarding
    const completeOnboarding = (name: string, formData: EvaluationFormData, initialPlan: InitialPlanResponse, failedMobilityIssues: MobilityIssue[]) => {
        const proteinGoal = Math.round(formData.weightKg * 1.8);

        const newHabit: KeystoneHabit = {
            ...initialPlan.keystoneHabitSuggestion,
            id: `kh-${Date.now()}`,
            currentStreak: 0,
            longestStreak: 0,
        };

        setUserProfile(prev => ({
            ...prev,
            name,
            weightKg: formData.weightKg,
            onboardingCompleted: true,
            evaluationData: formData,
            activeMobilityIssues: failedMobilityIssues,
            lastMobilityAssessmentDate: new Date().toISOString().split('T')[0],
            trainingCycle: {
                phase: 'adaptation',
                startDate: new Date().toISOString().split('T')[0],
            },
            nutritionSettings: {
                ...prev.nutritionSettings,
                priority: formData.nutritionPriority,
                proteinGoal: proteinGoal
            },
            keystoneHabits: [...prev.keystoneHabits, newHabit],
        }));

        addRoutine(initialPlan.routine);
        hideModal();
        showToast(`¡Bienvenido, ${name}! Tu viaje comienza ahora.`);
    };

    const startNewCycle = (newRoutine: Omit<Routine, 'id'>, newPhase: TrainingCycle['phase']) => {
        updateProfile({
            trainingCycle: {
                phase: newPhase,
                startDate: new Date().toISOString().split('T')[0],
            }
        });
        addRoutine(newRoutine);
        hideModal();
        showToast(`¡Excelente! Iniciando nueva fase de ${newPhase}.`);
        // LDC1: At the start of a new periodization cycle, request weekly commitment.
        showModal('weekly-planner', {}, { size: 'large' });
    };

    const extendCurrentCycle = () => {
        setUserProfile(prev => {
            if (!prev.trainingCycle) return prev;
            return {
                ...prev,
                trainingCycle: {
                    ...prev.trainingCycle,
                    startDate: new Date().toISOString().split('T')[0],
                }
            };
        });
        showToast("Ciclo actual extendido. ¡Vamos a consolidar!");
    };

    // Legend
    const updateQuestAndMilestones = (quest: string, milestonesData: Omit<Milestone, 'id' | 'isCompleted'>[]) => {
        const newMilestones: Milestone[] = milestonesData.map((m, i) => ({
            ...m,
            id: `ms-${Date.now()}-${i}`,
            isCompleted: false,
        }));
        setUserProfile(prev => ({ ...prev, quest, milestones: newMilestones }));
    };

    const requestSuccessManual = async () => {
        showToast("Generando tu manual...");
        const manualContent = await getSuccessManual({ userProfile, workoutHistory, routines, weeklyCheckIns });
        showModal('success-manual', { manualContent });
    };

    // Discipline
    const addReflection = (text: string) => {
        const todayISO = new Date().toISOString();
        const todayDate = todayISO.split('T')[0];

        const newJournalEntry: JournalEntry = {
            date: todayISO,
            type: 'user_reflection',
            title: "Reflexión del Día",
            body: text,
        };

        setUserProfile(prev => {
            // Update reflections array
            const otherReflections = prev.reflections.filter(r => r.date !== todayDate);
            const updatedReflections = [...otherReflections, { date: todayDate, text }];

            // Update journal array (replace today's reflection if it exists)
            const otherJournalEntries = prev.journal.filter(j =>
                !(j.type === 'user_reflection' && j.date.startsWith(todayDate))
            );
            const updatedJournal = [...otherJournalEntries, newJournalEntry];

            return {
                ...prev,
                reflections: updatedReflections,
                journal: updatedJournal,
            };
        });
        showToast("Reflexión guardada.");
    };

    const addKeystoneHabit = (habit: Omit<KeystoneHabit, 'id' | 'currentStreak' | 'longestStreak'>) => {
        const newHabit: KeystoneHabit = {
            ...habit,
            id: `kh-${Date.now()}`,
            currentStreak: 0,
            longestStreak: 0,
        };
        setUserProfile(p => ({ ...p, keystoneHabits: [...p.keystoneHabits, newHabit] }));
    };

    const playCompletionSound = () => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                logger.error('Web Audio API is not supported in this browser.', {
                    metadata: { error: e instanceof Error ? e.message : String(e) }
                });
                return;
            }
        }
        const audioContext = audioContextRef.current;
        if (!audioContext) return;

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note

        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    };

    const logHabitCompletion = (habitId: string) => {
        const today = new Date().toISOString().split('T')[0];

        // Prevent duplicate logs for the same day
        if (habitLogs.some(log => log.habitId === habitId && log.date === today)) return;

        const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];

        const wasCompletedYesterday = habitLogs.some(log => log.habitId === habitId && log.date === yesterday);

        // Update profile based on current state, using immer for safe mutation
        const newProfile = produce(userProfile, draft => {
            const habit = draft.keystoneHabits.find(h => h.id === habitId);
            if (habit) {
                const newStreak = wasCompletedYesterday ? habit.currentStreak + 1 : 1;
                habit.currentStreak = newStreak;
                habit.longestStreak = Math.max(habit.longestStreak, newStreak);
            }
        });
        setUserProfile(newProfile);

        // Update logs based on current state
        setHabitLogs([...habitLogs, { habitId, date: today }]);

        playCompletionSound();
    };

    // Master Regulation
    const updateMasterRegulationSettings = (settings: MasterRegulationSettings) => {
        setUserProfile(p => ({ ...p, masterRegulationSettings: settings }));
        showToast("Ajustes de regulación guardados.");
    };

    const updateNutritionSettings = (settings: NutritionSettings) => {
        setUserProfile(p => ({ ...p, nutritionSettings: settings }));
        showToast("Ajustes de nutrición guardados.");
    };

    // Daily & Weekly Logs
    const addOrUpdateDailyLog = async (log: Omit<DailyLog, 'date'> & { date: string }) => {
        setDailyLogs(prev => {
            const otherLogs = prev.filter(l => l.date !== log.date);
            return [...otherLogs, log];
        });

        const lowNutrition = log.nutrition <= 2;
        const lowRecovery = log.recovery <= 2;

        if (lowNutrition || lowRecovery) {
            hideModal(); // Close the daily check-in modal first
            showToast("Analizando tu registro...");
            const reframing = await getFailureReframing(userProfile, {
                type: lowNutrition ? 'nutrition' : 'recovery', // Prioritize nutrition if both are low
                score: lowNutrition ? log.nutrition : log.recovery,
            });
            if (reframing) {
                // FUI11: Show cognitive reframing in a side modal
                showModal('cognitive-reframing', reframing, { position: 'side' });
                const newEntry: JournalEntry = {
                    date: new Date().toISOString(),
                    type: 'ai_reframing',
                    title: `Lección de Resiliencia (${lowNutrition ? 'Nutrición' : 'Recuperación'})`,
                    body: reframing.reframedMessage,
                };
                setUserProfile(p => ({ ...p, journal: [...(p.journal || []), newEntry] }));
            } else {
                showToast("No se pudo obtener el análisis. ¡Sigue adelante!");
            }
        } else {
            hideModal(); // Normal flow
        }
    };

    const addWeeklyCheckIn = async (checkIn: Omit<WeeklyCheckIn, 'date'>) => {
        const today = new Date().toISOString().split('T')[0];
        const newCheckIn = { ...checkIn, date: today };
        const updatedCheckIns = [...weeklyCheckIns, newCheckIn];
        setWeeklyCheckIns(updatedCheckIns);
        hideModal();
        showToast("Registro guardado. Analizando...");

        const feedback = await getWeeklyCheckInFeedback(userProfile, updatedCheckIns);
        showModal('weekly-check-in-feedback', { feedback });

        // Autonomy phase check
        if (!userProfile.isInAutonomyPhase && updatedCheckIns.length >= 4) {
            setUserProfile(p => ({ ...p, isInAutonomyPhase: true }));
            showModal('autonomy-unlocked');
        }
    };

    // Mobility
    const completeMobilityAssessment = (failedIssues: MobilityIssue[]) => {
        updateProfile({
            activeMobilityIssues: failedIssues,
            lastMobilityAssessmentDate: new Date().toISOString().split('T')[0],
        });
        hideModal();
        if (failedIssues.length > 0) {
            showToast("Evaluación completada. Se añadirán ejercicios correctivos a tus calentamientos.");
        } else {
            showToast("¡Excelente movilidad! Evaluación completada.");
        }
    };

    // Chronotype
    const saveChronotypeAnalysis = (analysis: ChronotypeAnalysis) => {
        updateProfile({ chronotypeAnalysis: analysis });
        showToast("Análisis de cronotipo guardado en tu perfil.");
    };

    // Focus Session
    const startFocusSession = () => setIsFocusSessionActive(true);
    const endFocusSession = () => setIsFocusSessionActive(false);


    const value: AppContextType = {
        currentPage,
        userProfile,
        routines,
        workoutHistory,
        activeSession,
        isChatOpen,
        modal,
        toast,
        reconditioningPlans,
        dailyLogs,
        habitLogs,
        weeklyCheckIns,
        scheduledWorkouts,
        isPreWorkoutActive,
        pendingWorkoutRoutine,
        isFocusSessionActive,
        setCurrentPage,
        updateProfile,
        addRoutine,
        startWorkout,
        proceedToSession,
        endWorkout,
        updateSetProgress,
        toggleChat,
        showModal,
        hideModal,
        showToast,
        handleAiResponse,
        logUserFeedback,
        requestAiRoutineSuggestion,
        addReconditioningPlan,
        requestAiReconditioningPlanSuggestion,
        saveWeeklySchedule,
        rescheduleWorkout,
        reportTrainingInterruption,
        recalculateSchedule,
        compensateSchedule,
        completeOnboarding,
        startNewCycle,
        extendCurrentCycle,
        updateQuestAndMilestones,
        addReflection,
        logHabitCompletion,
        addKeystoneHabit,
        updateMasterRegulationSettings,
        updateNutritionSettings,
        addOrUpdateDailyLog,
        addWeeklyCheckIn,
        requestSuccessManual,
        completeMobilityAssessment,
        saveChronotypeAnalysis,
        startFocusSession,
        endFocusSession,
        setPendingWorkoutRoutine,
        adjustPendingWorkout,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// --- HOOK ---
export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

