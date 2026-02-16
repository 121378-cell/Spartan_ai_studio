import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { useTrainingRecommendations } from '../hooks/useTrainingRecommendations';
import { useAuth } from '../hooks/useAuth';
import type { TrainingRecommendationRequest } from '../services/api';

interface TrainingRecommendationsModalProps {
  trainingHistory?: any[];
  preferences?: any;
}

export default function TrainingRecommendationsModal({
  trainingHistory,
  preferences,
}: TrainingRecommendationsModalProps) {
  const { user } = useAuth();
  const {
    isLoading,
    error,
    recommendations,
    readinessStatus,
    generateRecommendations,
    explainRecommendations,
    getReadinessStatus,
  } = useTrainingRecommendations();

  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (user) {
      getReadinessStatus(user.userId);
    }
  }, [user, getReadinessStatus]);

  const handleGenerateRecommendations = async () => {
    if (!user) return;

    const request: TrainingRecommendationRequest = {
      trainingHistory,
      preferences,
    };

    try {
      await generateRecommendations(user.userId, request);
      setShowExplanation(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleExplainRecommendations = async () => {
    if (!user) return;

    const request: TrainingRecommendationRequest = {
      trainingHistory,
      preferences,
    };

    try {
      await explainRecommendations(user.userId, request);
      setShowExplanation(true);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Modal>
      <div className="space-y-6">
        {/* Readiness Status */}
        {readinessStatus && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Training Readiness</h3>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {readinessStatus.readinessScore}%
                </div>
                <div className="text-sm text-gray-600">
                  {readinessStatus.status.charAt(0).toUpperCase() + readinessStatus.status.slice(1)}
                </div>
              </div>
              <div className="text-sm text-gray-700">
                {readinessStatus.recommendation}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {readinessStatus.factors.hrv}%
                </div>
                <div className="text-xs text-gray-600">HRV</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {readinessStatus.factors.sleep}%
                </div>
                <div className="text-xs text-gray-600">Sleep</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {readinessStatus.factors.recovery}%
                </div>
                <div className="text-xs text-gray-600">Recovery</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {readinessStatus.factors.trainingLoad}%
                </div>
                <div className="text-xs text-gray-600">Training Load</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleGenerateRecommendations}
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate Training Plan'}
          </button>
          {recommendations && (
            <button
              onClick={handleExplainRecommendations}
              disabled={isLoading}
              className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Explaining...' : 'Explain Plan'}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    7-Day Training Plan
                  </h3>
                  <div className="flex gap-2 text-sm text-gray-600">
                    {recommendations.focusAreas.map((area, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(recommendations.confidence * 100)}%
                  </div>
                  <div className="text-xs text-gray-500">Confidence</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Expected Improvement</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {recommendations.expectedOutcomes.performanceImprovement.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Fatigue Level</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {recommendations.expectedOutcomes.fatigueLevel.toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Injury Risk</div>
                  <div className="text-2xl font-bold text-red-600">
                    {recommendations.expectedOutcomes.injuryRisk.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Week Plan */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-semibold text-gray-800">Weekly Plan</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2 p-4">
                {recommendations.weekPlan.map((session, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="text-sm font-semibold text-gray-800 mb-2">
                      {session.dayOfWeek}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {session.type}
                    </div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {session.duration} min
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      Intensity: {session.intensity}/10
                    </div>
                    {session.focus && session.focus.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {session.focus.map((focus, i) => (
                          <span
                            key={i}
                            className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {focus}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Personalized Tips */}
            {recommendations.personalizedTips.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Personalized Tips</h4>
                <div className="space-y-3">
                  {recommendations.personalizedTips.map((tip, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 text-sm text-gray-700">
                        {tip}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning (Show only when explanation requested) */}
            {showExplanation && recommendations.reasoning.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Why This Plan?</h4>
                <div className="space-y-2">
                  {recommendations.reasoning.map((reason, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 text-sm text-gray-700">
                        {reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
