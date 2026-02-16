import { useMemo } from 'react';
import type { WorkoutHistory, WeeklyCheckIn } from '../types.ts';

export interface ChartDataPoint {
    date: string;
    load: number;
    stress: number;
}

export const useChartData = (
    workoutHistory: WorkoutHistory[],
    weeklyCheckIns: WeeklyCheckIn[]
): ChartDataPoint[] => {
    return useMemo(() => {
        if (weeklyCheckIns.length === 0) return [];

        // Create a map of check-in dates to stress levels for quick lookup
        const stressMap = new Map<string, number>();
        weeklyCheckIns.forEach(checkIn => {
            stressMap.set(checkIn.date, checkIn.perceivedStress);
        });

        // Calculate training load for the week leading up to each check-in
        const dataPoints: ChartDataPoint[] = weeklyCheckIns.map((checkIn, index) => {
            const checkInDate = new Date(checkIn.date);
            const oneWeekPrior = new Date(new Date(checkIn.date).setDate(checkInDate.getDate() - 7));

            const relevantWorkouts = workoutHistory.filter(wh => {
                const workoutDate = new Date(wh.date);
                return workoutDate > oneWeekPrior && workoutDate <= checkInDate;
            });
            
            // A simple load calculation: sum of durations
            const weeklyLoad = relevantWorkouts.reduce((sum, workout) => sum + workout.durationMinutes, 0);

            return {
                date: checkIn.date,
                load: weeklyLoad, // Raw load in minutes
                stress: checkIn.perceivedStress, // Stress on a 0-10 scale
            };
        });

        return dataPoints;

    }, [workoutHistory, weeklyCheckIns]);
};
