
import { useMemo } from 'react';
import type { DailyLog, HabitLog, KeystoneHabit } from '../types.ts';

const getRecentDates = (days: number): string[] => {
    const dates = [];
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
};

export const useBurnoutPrediction = (
    dailyLogs: DailyLog[],
    habitLogs: HabitLog[],
    keystoneHabits: KeystoneHabit[]
): { isSignatureDetected: boolean; reason: string | null } => {
    const prediction = useMemo(() => {
        // We need at least one keystone habit and some logs to make a prediction
        if (keystoneHabits.length === 0 || dailyLogs.length < 2) {
            return { isSignatureDetected: false, reason: null };
        }

        const last3Days = getRecentDates(3);
        const yesterday = last3Days[1];

        // --- Signature Check 1: Poor Recovery ---
        const recentRecoveryLogs = dailyLogs.filter(log => last3Days.includes(log.date));
        let lowRecoverySignal = false;
        let reason = '';
        
        if (recentRecoveryLogs.length >= 2) {
            const avgRecovery = recentRecoveryLogs.reduce((sum, log) => sum + log.recovery, 0) / recentRecoveryLogs.length;
            if (avgRecovery < 3) {
                lowRecoverySignal = true;
                reason = "Tus niveles de recuperación han sido bajos últimamente.";
            }
        }

        // --- Signature Check 2: Lapsed Discipline ---
        const primaryHabitId = keystoneHabits[0].id;
        const habitLoggedYesterday = habitLogs.some(log => log.habitId === primaryHabitId && log.date === yesterday);
        const habitLoggedDayBefore = habitLogs.some(log => log.habitId === primaryHabitId && log.date === last3Days[2]);
        let lapsedHabitSignal = false;

        // If it was logged two days ago but not yesterday, that's a lapse.
        if (habitLoggedDayBefore && !habitLoggedYesterday) {
            lapsedHabitSignal = true;
            reason = reason ? `${reason} Además, parece que has roto la racha de tu hábito clave.` : "Parece que has roto la racha de tu hábito clave.";
        }
        
        // --- Final Decision ---
        // A strong signal (low recovery) OR a lapse in a core habit can trigger the alert.
        if (lowRecoverySignal || lapsedHabitSignal) {
            return { isSignatureDetected: true, reason };
        }

        return { isSignatureDetected: false, reason: null };
    }, [dailyLogs, habitLogs, keystoneHabits]);

    return prediction;
};

