import React, { useState, useCallback, useEffect } from 'react';
import { VideoCaptureState, PoseFrame, FormAnalysisResult } from '../../types/pose';
import VideoCapture from './VideoCapture';
import { getPoseDetectionService } from '../../services/poseDetection';
import VitalisFeedbackAlert from './VitalisFeedbackAlert';
import { DeadliftReportView } from './DeadliftReportView';
import BackendApiService from '../../services/api';
import { logger } from '../../utils/logger';

interface FormAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete?: (result: FormAnalysisResult) => void;
  exerciseType: 'squat' | 'deadlift' | 'push_up' | 'plank' | 'row';
  userId?: string;
}

export const FormAnalysisModal: React.FC<FormAnalysisModalProps> = ({
  isOpen,
  onClose,
  onAnalysisComplete,
  exerciseType,
  userId,
}) => {
  const [captureState, setCaptureState] = useState<VideoCaptureState>({
    isActive: false,
    framesProcessed: 0,
    fps: 0,
    lastFrameTime: 0,
    error: null,
  });

  const [analysisResult, setAnalysisResult] = useState<FormAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFormScore, setCurrentFormScore] = useState<number | undefined>();

  const handleCaptureStateChange = useCallback((newState: VideoCaptureState) => {
    setCaptureState(newState);
  }, []);

  const handleAnalysisComplete = useCallback(async (result: FormAnalysisResult) => {
    setAnalysisResult(result);
    setCurrentFormScore(result.score);
    onAnalysisComplete?.(result);

    // Auto-save if userId is present
    if (userId) {
      try {
        await BackendApiService.saveFormAnalysis({
          userId,
          exerciseType,
          formScore: result.score,
          metrics: result.metrics,
          warnings: result.issues.map(i => `${i.label}: ${i.description}`),
          recommendations: result.tips,
          timestamp: new Date().toISOString()
        });
        logger.info('Form analysis saved successfully', { context: 'FormAnalysisModal' });
      } catch (error) {
        logger.error('Failed to auto-save form analysis', { context: 'FormAnalysisModal', error });
      }
    }
  }, [onAnalysisComplete, userId, exerciseType]);

  const handleClose = useCallback(() => {
    setCaptureState({ isActive: false, framesProcessed: 0, fps: 0, lastFrameTime: 0, error: null });
    setAnalysisResult(null);
    setCurrentFormScore(undefined);
    onClose();
  }, [onClose]);

  const getExerciseLabel = (type: string) => {
    const labels: Record<string, string> = {
      squat: 'Sentadilla',
      deadlift: 'Peso Muerto',
      push_up: 'Flexiones',
      plank: 'Plancha',
      row: 'Remo'
    };
    return labels[type] || type;
  };

  const getMetricLabel = (key: string) => {
    const labels: Record<string, string> = {
      hipDepth: 'Profundidad Cadera',
      kneeAngle: 'Ángulo Rodilla',
      torsoAngle: 'Ángulo Torso',
      backAngle: 'Desviación Espalda',
      kneeExtension: 'Extensión Rodilla',
      hipHinge: 'Bisagra Cadera',
      elbowAngle: 'Ángulo Codo',
      bodyAlignment: 'Alineación Cuerpo',
      elbowFlare: 'Apertura Codos'
    };
    return labels[key] || key;
  };

  if (!isOpen) return null;

  // Renderizado específico para el reporte detallado de Peso Muerto
  if (analysisResult && exerciseType === 'deadlift') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl h-[90vh] overflow-hidden flex flex-col">
          <DeadliftReportView
            result={analysisResult}
            onRetry={() => setAnalysisResult(null)}
            onClose={handleClose}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            Análisis de Forma - {getExerciseLabel(exerciseType)}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Vitalis Alerts - Show during and after analysis */}
        {userId && (
          <div className="px-6 pt-4">
            <VitalisFeedbackAlert
              userId={userId}
              formScore={currentFormScore}
              exerciseType={exerciseType}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {analysisResult ? (
            /* Results View */
            <div className="space-y-6">
              {/* Score Display */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Puntuación General</p>
                    <p className="text-4xl font-bold text-gray-900">{analysisResult.score}</p>
                  </div>
                  <div className="text-5xl">
                    {analysisResult.score >= 80
                      ? '🌟'
                      : analysisResult.score >= 60
                        ? '👍'
                        : '💪'}
                  </div>
                </div>
              </div>

              {/* Issues List */}
              {analysisResult.issues.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Puntos de Mejora</h3>
                  {analysisResult.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border-l-4 ${
                        issue.severity === 'high'
                          ? 'border-red-500 bg-red-50'
                          : issue.severity === 'medium'
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{issue.label}</p>
                      <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips */}
              {analysisResult.tips.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-green-900">💡 Consejos</h3>
                  <ul className="space-y-1">
                    {analysisResult.tips.map((tip, idx) => (
                      <li key={idx} className="text-sm text-green-800">
                        • {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metrics */}
              {analysisResult.metrics && (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(analysisResult.metrics).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase tracking-wide">{getMetricLabel(key)}</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {typeof value === 'number' ? value.toFixed(1) : value}°
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Capture View */
            <div className="space-y-4">
              <VideoCapture
                exerciseType={exerciseType}
                onStateChange={handleCaptureStateChange}
                onAnalysisComplete={handleAnalysisComplete}
              />

              {/* Status Bar */}
              <div className="border-t pt-4 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="text-gray-600">Frames</p>
                    <p className="text-lg font-semibold text-gray-900">{captureState.framesProcessed}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">FPS</p>
                    <p className="text-lg font-semibold text-gray-900">{captureState.fps?.toFixed(1) || '0'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Estado</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {captureState.isActive ? '🔴 En vivo' : '⚪ Listo'}
                    </p>
                  </div>
                </div>

                {captureState.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">
                      <span className="font-semibold">Error:</span> {captureState.error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          {analysisResult ? (
            <>
              <button
                onClick={() => setAnalysisResult(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Analizar Nuevamente
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Cerrar
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormAnalysisModal;
