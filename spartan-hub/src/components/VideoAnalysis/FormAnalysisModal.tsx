import React, { useState, useCallback, useEffect } from 'react';
import { VideoCaptureState, PoseFrame, FormAnalysisResult } from '../../types/pose';
import VideoCapture from './VideoCapture';
import { getPoseDetectionService } from '../../services/poseDetection';
import VitalisFeedbackAlert from './VitalisFeedbackAlert';
import { DeadliftReportView } from './DeadliftReportView';
import BackendApiService from '../../services/api';
import { logger } from '../../utils/logger';
import { useTranslation } from 'react-i18next';
import { useDevice } from '../../context/DeviceContext';

interface FormAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete?: (result: FormAnalysisResult) => void;
  exerciseType: 'squat' | 'deadlift' | 'push_up' | 'plank' | 'row';
  userId?: string;
}

/**
 * FormAnalysisModal - Mobile Optimized
 * 
 * Features:
 * - Touch-friendly controls (min 44x44px)
 * - Safe area inset support for iOS notch
 * - Responsive layout with mobile-first design
 * - Improved accessibility
 */
export const FormAnalysisModal: React.FC<FormAnalysisModalProps> = ({
  isOpen,
  onClose,
  onAnalysisComplete,
  exerciseType,
  userId,
}) => {
  const { t } = useTranslation();
  const { isMobile, isTablet } = useDevice();
  
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
        logger.error('Failed to auto-save form analysis', { context: 'FormAnalysisModal' });
      }
    }
  }, [onAnalysisComplete, userId, exerciseType]);

  const handleClose = useCallback(() => {
    setCaptureState({ isActive: false, framesProcessed: 0, fps: 0, lastFrameTime: 0, error: null });
    setAnalysisResult(null);
    setCurrentFormScore(undefined);
    onClose();
  }, [onClose]);

  // Close on escape key (accessibility)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  // Renderizado específico para el reporte detallado de Peso Muerto
  if (analysisResult && exerciseType === 'deadlift') {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div 
          className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: 'calc(90vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}
        >
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={`relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col
                    ${isMobile ? 'max-h-[95vh] h-full' : 'max-w-2xl max-h-[90vh]'}`}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxHeight: isMobile 
            ? 'calc(95vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))' 
            : 'calc(90vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))'
        }}
      >
        {/* Header - Touch-friendly with larger close button */}
        <div 
          className={`flex items-center justify-between px-4 py-3 sticky top-0 bg-white z-10 border-b
                      ${isMobile ? 'pt-2' : 'pt-4'}`}
          style={{ paddingTop: isMobile ? 'calc(0.5rem + env(safe-area-inset-top))' : '1rem' }}
        >
          <h2 
            id="modal-title"
            className={`font-semibold text-gray-900 ${isMobile ? 'text-lg' : 'text-xl'}`}
          >
            {t('videoAnalysis.title')} - {t(`videoAnalysis.exerciseTypes.${exerciseType}`)}
          </h2>
          <button
            onClick={handleClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center 
                     text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full 
                     transition-all active:scale-90 touch-manipulation p-2"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Vitalis Alerts */}
        {userId && (
          <div className={`px-4 ${isMobile ? 'pt-3' : 'pt-4'}`}>
            <VitalisFeedbackAlert
              userId={userId}
              formScore={currentFormScore}
              exerciseType={exerciseType}
            />
          </div>
        )}

        {/* Content - Scrollable area */}
        <div className={`flex-1 overflow-y-auto p-4 ${isMobile ? 'pb-24' : 'pb-6'}`}>
          {analysisResult ? (
            /* Results View */
            <div className="space-y-4">
              {/* Score Display - Enhanced for mobile */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">{t('videoAnalysis.generalScore')}</p>
                    <p className={`font-bold text-gray-900 ${isMobile ? 'text-4xl' : 'text-5xl'}`}>
                      {analysisResult.score}
                    </p>
                  </div>
                  <div className={`
                    ${isMobile ? 'text-4xl' : 'text-5xl'}
                  `}>
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
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 text-base">
                    {t('videoAnalysis.improvementPoints')}
                  </h3>
                  {analysisResult.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border-l-4 ${
                        issue.severity === 'high'
                          ? 'border-red-500 bg-red-50'
                          : issue.severity === 'medium'
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <p className="font-medium text-gray-900 text-sm">{issue.label}</p>
                      <p className="text-sm text-gray-600 mt-1.5">{issue.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips */}
              {analysisResult.tips.length > 0 && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 space-y-2">
                  <h3 className="font-semibold text-green-900 text-base flex items-center gap-2">
                    <span>💡</span>
                    {t('videoAnalysis.tips')}
                  </h3>
                  <ul className="space-y-1.5">
                    {analysisResult.tips.map((tip, idx) => (
                      <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metrics - Grid layout for mobile */}
              {analysisResult.metrics && (
                <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {Object.entries(analysisResult.metrics).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">
                        {t(`videoAnalysis.metricsLabels.${key}`, { defaultValue: key })}
                      </p>
                      <p className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-xl'} mt-1`}>
                        {typeof value === 'number' ? value.toFixed(1) : value}°
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <VideoCapture
                exerciseType={exerciseType}
                onStateChange={handleCaptureStateChange}
                onAnalysisComplete={handleAnalysisComplete}
              />

              {/* Status Bar - Touch-friendly */}
              <div className="border-t pt-4 space-y-3">
                <div className={`grid gap-3 text-center ${isMobile ? 'grid-cols-3' : 'grid-cols-3'}`}>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <p className="text-gray-600 text-xs font-medium">{t('videoAnalysis.frames')}</p>
                    <p className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                      {captureState.framesProcessed}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <p className="text-gray-600 text-xs font-medium">{t('videoAnalysis.fps')}</p>
                    <p className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                      {captureState.fps?.toFixed(1) || '0'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <p className="text-gray-600 text-xs font-medium">{t('videoAnalysis.status')}</p>
                    <p className={`font-bold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
                      {captureState.isActive ? `🔴 ${t('videoAnalysis.live')}` : `⚪ ${t('videoAnalysis.ready')}`}
                    </p>
                  </div>
                </div>

                {captureState.error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-800">
                      <span className="font-semibold">Error:</span> {captureState.error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom with safe area inset */}
        <div 
          className={`border-t px-4 py-3 flex justify-end gap-3 bg-white sticky bottom-0
                      ${isMobile ? 'pb-2' : 'pb-4'}`}
          style={{ paddingBottom: isMobile ? 'calc(0.75rem + env(safe-area-inset-bottom))' : '1rem' }}
        >
          {analysisResult ? (
            <>
              <button
                onClick={() => setAnalysisResult(null)}
                className="min-h-[44px] px-5 py-2.5 border-2 border-gray-300 text-gray-700 
                         rounded-xl hover:bg-gray-50 font-semibold transition-all 
                         active:scale-95 touch-manipulation text-sm"
              >
                🔄 {t('videoAnalysis.analyzeAgain')}
              </button>
              <button
                onClick={handleClose}
                className="min-h-[44px] px-5 py-2.5 bg-blue-600 text-white rounded-xl 
                         hover:bg-blue-700 font-semibold transition-all active:scale-95 
                         touch-manipulation shadow-md text-sm"
              >
                ✓ {t('videoAnalysis.close')}
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="min-h-[44px] px-5 py-2.5 border-2 border-gray-300 text-gray-700 
                       rounded-xl hover:bg-gray-50 font-semibold transition-all 
                       active:scale-95 touch-manipulation text-sm"
            >
              {t('videoAnalysis.cancel')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormAnalysisModal;
