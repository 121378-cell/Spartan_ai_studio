
import { useMemo } from 'react';
import type { DailyLog, WorkoutHistory } from '../types.ts';

const getDatesInRange = (days: number): string[] => {
    const dates = [];
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
};

type SynergisticLoadResult = {
    score: number;
    level: 'peak' | 'ready' | 'caution' | 'recovery';
    recommendation: string;
};

export const useSynergisticLoad = (
    workoutHistory: WorkoutHistory[],
    dailyLogs: DailyLog[]
): SynergisticLoadResult => {
    return useMemo(() => {
        // --- 1. Calculate Training Load (last 7 days) ---
        const last7Days = getDatesInRange(7);
        const recentWorkouts = workoutHistory.filter(wh => last7Days.includes(wh.date));
        
        // Simple load metric: 10 points per workout + 1 point per 10 mins duration
        let rawLoad = recentWorkouts.reduce((acc, workout) => {
            return acc + 10 + (workout.durationMinutes / 10);
        }, 0);
        
        // Normalize load to a 0-100 scale (inverted, so high load = low score)
        // Capping raw load at 100 for normalization, a very high but plausible value.
        const loadScore = 100 - Math.min(rawLoad, 100);

        // --- 2. Calculate Recovery Score (last 3 days) ---
        const last3Days = getDatesInRange(3);
        const recentLogs = dailyLogs.filter(log => last3Days.includes(log.date));
        
        let recoveryScore = 50; // Default to neutral if no recent logs
        if (recentLogs.length > 0) {
            const avgRecovery = recentLogs.reduce((sum, log) => sum + log.recovery, 0) / recentLogs.length;
            // Map 1-5 scale to 0-100
            recoveryScore = (avgRecovery - 1) * 25;
        }

        // --- 3. Combine Scores ---
        // Weighted average: 65% recovery, 35% load
        const finalScore = Math.round((recoveryScore * 0.65) + (loadScore * 0.35));

        // --- 4. Determine Level and Recommendation ---
        let level: SynergisticLoadResult['level'] = 'caution';
        let recommendation = '';

        if (finalScore >= 80) {
            level = 'peak';
            recommendation = 'Tu cuerpo y mente están en sincronía. Es un día ideal para un rendimiento máximo.';
        } else if (finalScore >= 60) {
            level = 'ready';
            recommendation = 'Estás preparado para un entrenamiento sólido y consistente. Cíñete al plan.';
        } else if (finalScore >= 40) {
            level = 'caution';
            recommendation = 'Escucha a tu cuerpo. Considera reducir la intensidad y centrarte en la técnica.';
        } else {
            level = 'recovery';
            recommendation = 'La recuperación es clave hoy. Prioriza el descanso o una sesión de reacondicionamiento ligero.';
        }

        return { score: finalScore, level, recommendation };

    }, [workoutHistory, dailyLogs]);
};

