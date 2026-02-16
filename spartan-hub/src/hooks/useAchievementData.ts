import { useMemo } from 'react';
import type { UserProfile, WorkoutHistory, DailyLog, HabitLog } from '../types.ts';

interface AchievementData {
    bestVolume: number;
    longestHabit: { name: string; streak: number };
    bestSleepStreak: number;
    focusProtocolsUsed: number;
}

export const useAchievementData = (
    userProfile: UserProfile,
    workoutHistory: WorkoutHistory[],
    dailyLogs: DailyLog[],
    habitLogs: HabitLog[]
): AchievementData => {
    return useMemo(() => {
        // 1. Best Volume PR
        const bestVolume = workoutHistory.reduce((max, wh) => Math.max(max, wh.totalWeightLifted), 0);

        // 2. Longest Keystone Habit Streak
        const longestHabit = userProfile.keystoneHabits.reduce(
            (longest, habit) => (habit.longestStreak > longest.streak ? { name: habit.name, streak: habit.longestStreak } : longest),
            { name: userProfile.keystoneHabits[0]?.name || 'N/A', streak: userProfile.keystoneHabits[0]?.longestStreak || 0 }
        );

        // 3. Best Sleep Streak (Recovery >= 4)
        let bestSleepStreak = 0;
        if (dailyLogs.length > 0) {
            const sortedLogs = [...dailyLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let currentStreak = 0;
            let lastDate: Date | null = null;
            
            for (const log of sortedLogs) {
                const currentDate = new Date(log.date);
                const isConsecutive = lastDate ? (currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24) === 1 : true;
                
                if (log.recovery >= 4) {
                    if (isConsecutive) {
                        currentStreak++;
                    } else {
                        currentStreak = 1;
                    }
                } else {
                    currentStreak = 0;
                }
                
                if (currentStreak > bestSleepStreak) {
                    bestSleepStreak = currentStreak;
                }
                lastDate = currentDate;
            }
        }
        
        // 4. Focus Protocols Used (Mocked data)
        // This would need to be tracked properly in a real application
        const focusProtocolsUsed = 17;

        return {
            bestVolume,
            longestHabit,
            bestSleepStreak,
            focusProtocolsUsed,
        };
    }, [userProfile, workoutHistory, dailyLogs, habitLogs]);
};
