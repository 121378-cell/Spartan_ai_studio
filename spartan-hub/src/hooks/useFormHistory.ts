import { useState, useCallback, useEffect } from 'react';
import BackendApiService from '../services/api';
import { logger } from '../utils/logger';

export interface FormSession {
    id: number;
    exercise_type: string;
    session_start: string;
    session_end: string;
    duration_seconds: number;
    average_score: number;
    best_score: number;
    worst_score: number;
    total_reps: number;
    completed_reps: number;
    notes: string;
}

export interface ExerciseStat {
    exercise_type: string;
    total_sessions: number;
    avg_score: number;
    best_score: number;
    worst_score: number;
    total_reps: number;
    completed_reps: number;
    avg_duration: number;
}

export function useFormHistory(userId?: string) {
    const [sessions, setSessions] = useState<FormSession[]>([]);
    const [stats, setStats] = useState<ExerciseStat[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshHistory = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const [sessionsData, statsData] = await Promise.all([
                BackendApiService.getUserFormTrends(id, 90), // Last 90 days
                BackendApiService.getUserExerciseStats(id)
            ]);
            setSessions(sessionsData);
            setStats(statsData);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error fetching form history';
            setError(msg);
            logger.error('useFormHistory: Failed to fetch data', { metadata: { error: msg, userId: id } });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (userId) {
            refreshHistory(userId);
        }
    }, [userId, refreshHistory]);

    const getStatsForExercise = (type: string) => {
        return stats.find(s => s.exercise_type === type);
    };

    const getBestScore = (type?: string) => {
        if (type) {
            return getStatsForExercise(type)?.best_score || 0;
        }
        return Math.max(...stats.map(s => s.best_score), 0);
    };

    return {
        sessions,
        stats,
        isLoading,
        error,
        refreshHistory,
        getStatsForExercise,
        getBestScore
    };
}
