import { useState, useCallback, useEffect } from 'react';
import BackendApiService from '../services/api';
import { logger } from '../utils/logger';

export interface AthleteSummary {
    id: string;
    name: string;
    email: string;
    assignedAt: string;
    totalWorkouts: number;
    injuryRisk: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
}

export function useCoachAthletes() {
    const [athletes, setAthletes] = useState<AthleteSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshAthletes = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await BackendApiService.getCoachAthletes();
            setAthletes(data);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error fetching athletes';
            setError(msg);
            logger.error('useCoachAthletes: Failed to fetch data', { metadata: { error: msg } });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshAthletes();
    }, [refreshAthletes]);

    return {
        athletes,
        isLoading,
        error,
        refreshAthletes
    };
}
