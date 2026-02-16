import { useState, useCallback, useEffect } from 'react';
import BackendApiService from '../services/api';
import { logger } from '../utils/logger';

export interface MLPredictions {
    weeklyForecast: any;
    injuryProbability: {
        probabilityPercent: number;
        riskScore: number;
        riskFactors: {
            elevatedRHR: boolean;
            suppressedHRV: boolean;
            sleepDeprivation: boolean;
            consecutiveHardDays: boolean;
            overtrainingMarker: boolean;
        };
        recommendation: string;
        confidenceScore: number;
    };
    fatigueEstimate: {
        fatigueLevel: number;
        acuteToChronicRatio: number;
        recoveryCapacity: number;
        estimatedRecoveryDays: number;
        recommendation: string;
    };
    trainingLoadSuggestion: {
        suggestedLoad: string;
        maxWorkoutDurationMinutes: number;
        recommendedExercises: string[];
        rationale: string;
        expectedRecoveryTime: number;
    };
    generatedAt: string;
}

export function useMLForecasting(userId?: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [predictions, setPredictions] = useState<MLPredictions | null>(null);

    const fetchPredictions = useCallback(async (id: string, date?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await BackendApiService.getComprehensivePredictions(id, date);
            setPredictions(data);
            return data;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error fetching ML predictions';
            setError(msg);
            logger.error('useMLForecasting: Failed to fetch predictions', { metadata: { error: msg, userId: id } });
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (userId) {
            fetchPredictions(userId);
        }
    }, [userId, fetchPredictions]);

    return {
        isLoading,
        error,
        predictions,
        fetchPredictions
    };
}
