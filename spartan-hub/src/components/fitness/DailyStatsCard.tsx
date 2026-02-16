import React, { useEffect, useState, useCallback } from 'react';
import { googleFitService } from '../../services/googleFit';
import { Footprints, RefreshCw, AlertCircle } from 'lucide-react';

interface DailyStats {
    steps: number;
    timestamp: number;
}

interface FetchState {
    status: 'idle' | 'loading' | 'success' | 'error';
    error?: string;
    retryCount: number;
}

/**
 * DailyStatsCard Component
 * 
 * Displays daily step count from Google Fit
 * 
 * Features:
 * - Auto-fetch steps on component mount
 * - Manual refresh via button
 * - Progress bar (goal: 10,000 steps)
 * - Error handling with retry
 * - Auto-retry on network errors (up to 3 attempts)
 * - Shows loading skeleton while fetching
 * - Connection status persistence
 * 
 * States:
 * - idle: Ready to fetch
 * - loading: Fetching data from API
 * - success: Data successfully retrieved
 * - error: Failed to fetch (shows error message)
 */
export const DailyStatsCard: React.FC = () => {
    const [stats, setStats] = useState<DailyStats | null>(null);
    const [fetchState, setFetchState] = useState<FetchState>({
        status: 'loading',
        retryCount: 0
    });
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

    const MAX_RETRY_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 2000; // 2 seconds between retries

    /**
     * Fetch stats from Google Fit API
     * Includes retry logic for network failures
     */
    const fetchStats = useCallback(async (attemptNumber: number = 1) => {
        setFetchState(prev => ({ ...prev, status: 'loading', error: undefined }));

        try {
            console.log(`[DailyStatsCard] Fetching stats (attempt ${attemptNumber}/${MAX_RETRY_ATTEMPTS})`, {
                timestamp: new Date().toISOString()
            });

            const data = await googleFitService.getDailyStats();

            if (!data || typeof data.steps !== 'number') {
                throw new Error('Invalid data format received from API');
            }

            // Validate step count is reasonable (0 - 100,000)
            if (data.steps < 0 || data.steps > 100000) {
                console.warn('[DailyStatsCard] Suspicious step count:', data.steps);
            }

            setStats(data);
            setLastUpdateTime(new Date());
            setFetchState({
                status: 'success',
                retryCount: 0
            });

            console.log('[DailyStatsCard] ✅ Stats fetched successfully', {
                timestamp: new Date().toISOString(),
                steps: data.steps
            });
        } catch (err) {
            const error = err instanceof Error ? err.message : 'Unknown error';

            console.error('[DailyStatsCard] ❌ Failed to fetch stats:', {
                timestamp: new Date().toISOString(),
                error,
                attempt: attemptNumber,
                maxAttempts: MAX_RETRY_ATTEMPTS
            });

            // Determine if error is retryable (network errors, timeouts, 5xx errors)
            const isRetryable = error.includes('Network') || 
                               error.includes('timeout') || 
                               error.includes('500') ||
                               error.includes('503');

            if (isRetryable && attemptNumber < MAX_RETRY_ATTEMPTS) {
                // Schedule retry
                setTimeout(() => {
                    console.log('[DailyStatsCard] Retrying...', {
                        timestamp: new Date().toISOString(),
                        nextAttemptIn: RETRY_DELAY_MS + 'ms'
                    });
                    fetchStats(attemptNumber + 1);
                }, RETRY_DELAY_MS);

                setFetchState(prev => ({
                    ...prev,
                    retryCount: attemptNumber,
                    error: `Retrying... (${attemptNumber}/${MAX_RETRY_ATTEMPTS})`
                }));
            } else {
                // Final error state
                const errorMessage = isRetryable && attemptNumber >= MAX_RETRY_ATTEMPTS
                    ? 'Unable to fetch steps after multiple attempts. Please check your connection.'
                    : error === 'Failed to fetch stats'
                    ? 'Not connected to Google Fit. Please connect first.'
                    : error;

                setFetchState({
                    status: 'error',
                    error: errorMessage,
                    retryCount: attemptNumber
                });

                // Still show stats from cache if available
                if (!stats) {
                    setStats(null);
                }
            }
        }
    }, [stats]);

    /**
     * Auto-fetch stats on component mount
     * Runs every 5 minutes to keep data fresh
     */
    useEffect(() => {
        fetchStats();

        // Refresh every 5 minutes
        const interval = setInterval(() => {
            fetchStats();
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [fetchStats]);

    /**
     * Calculate progress percentage
     */
    const progressPercentage = stats ? Math.min((stats.steps / 10000) * 100, 100) : 0;

    /**
     * Format step count with thousands separator
     */
    const formattedSteps = stats?.steps.toLocaleString() ?? '0';

    // Don't render if not connected (error state that's not retryable)
    if (fetchState.status === 'error' && !stats && fetchState.retryCount >= MAX_RETRY_ATTEMPTS) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 backdrop-blur-md border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all duration-500" />

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div>
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Daily Steps</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        {lastUpdateTime 
                            ? `Updated at ${lastUpdateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Google Fit'
                        }
                    </p>
                </div>
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    <Footprints size={20} />
                </div>
            </div>

            <div className="relative z-10">
                {/* Step Count Display */}
                {fetchState.status === 'loading' && !stats ? (
                    <div className="h-8 w-24 bg-gray-700/50 rounded animate-pulse" />
                ) : (
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">{formattedSteps}</span>
                        <span className="text-sm text-gray-400">steps</span>
                    </div>
                )}

                {/* Progress Bar */}
                <div className="mt-4 h-1.5 w-full bg-gray-700/30 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ 
                            width: `${progressPercentage}%`,
                            boxShadow: progressPercentage > 0 ? '0 0 12px rgba(59, 130, 246, 0.5)' : 'none'
                        }}
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">
                    Goal: 10,000 
                    {stats && (
                        <span className="text-blue-400 ml-2">
                            ({Math.round(progressPercentage)}%)
                        </span>
                    )}
                </p>
            </div>

            {/* Error Message */}
            {fetchState.status === 'error' && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 relative z-10">
                    <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">{fetchState.error}</p>
                </div>
            )}

            {/* Refresh Button */}
            <button
                onClick={() => fetchStats()}
                disabled={fetchState.status === 'loading'}
                className="absolute bottom-2 right-2 p-1.5 text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                title={lastUpdateTime ? `Last updated: ${lastUpdateTime.toLocaleTimeString()}` : 'Refresh'}
            >
                <RefreshCw 
                    size={14} 
                    className={fetchState.status === 'loading' ? 'animate-spin' : ''} 
                />
            </button>

            {/* Loading Indicator */}
            {fetchState.status === 'loading' && (
                <div className="absolute bottom-2 left-2 text-xs text-gray-500 relative z-10">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        Syncing...
                    </div>
                </div>
            )}
        </div>
    );
};
