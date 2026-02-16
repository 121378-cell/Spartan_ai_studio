import React from 'react';
import BrainIcon from './icons/BrainIcon';
import RefreshIcon from './icons/RefreshIcon';
import HomeIcon from './icons/HomeIcon';
import ErrorReportButton from './ErrorReportButton';

interface AiErrorScreenProps {
  error: string;
  onRetry: () => void;
  onGoHome: () => void;
  userProfile?: any; // Add userProfile prop for context
}

const AiErrorScreen: React.FC<AiErrorScreenProps> = ({ error, onRetry, onGoHome, userProfile }) => {
  // Check if the error is related to Ollama timeout
  const isOllamaTimeout = error.includes('timeout') && error.includes('Ollama');
  
  return (
    <div className="fixed inset-0 bg-spartan-bg bg-opacity-90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-spartan-surface rounded-xl shadow-2xl max-w-md w-full mx-4 border border-spartan-border animate-fadeIn">
        <div className="p-6 text-center">
          {/* Error Icon */}
          <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <BrainIcon className="w-8 h-8 text-red-500" />
          </div>
          
          {/* Error Title */}
          <h2 className="text-2xl font-bold text-spartan-text mb-2">¡Ups! Algo salió mal</h2>
          
          {/* Error Description */}
          <p className="text-spartan-text-secondary mb-6">
            {isOllamaTimeout ? (
              <>
                El sistema de inteligencia artificial no está respondiendo como se esperaba. 
                Esto puede deberse a que el servicio Ollama local no está funcionando correctamente.
              </>
            ) : (
              <>
                El sistema de inteligencia artificial no está respondiendo como se esperaba. 
                Esto puede deberse a una sobrecarga temporal o a un problema de conexión.
              </>
            )}
          </p>
          
          {/* Migration Notice */}
          {isOllamaTimeout && (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-spartan-text">
                <strong>Nota:</strong> Estamos trabajando en la migración a una API de IA más estable. 
                Esta transición mejorará significativamente la fiabilidad del servicio.
              </p>
            </div>
          )}
          
          {/* Error Details */}
          <div className="bg-spartan-card rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-spartan-text mb-1">Detalles del error:</p>
            <p className="text-xs text-spartan-text-secondary break-words">{error}</p>
          </div>
          
          {/* Report Button */}
          <div className="mb-6">
            <ErrorReportButton 
              error={error}
              component="AiErrorScreen"
              context={{ isOllamaTimeout }}
              userProfile={userProfile}
            >
              Reportar este error
            </ErrorReportButton>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onRetry}
              className="flex-1 flex items-center justify-center gap-2 bg-spartan-gold text-spartan-bg font-bold py-3 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <RefreshIcon className="w-5 h-5" />
              Reintentar
            </button>
            <button
              onClick={onGoHome}
              className="flex-1 flex items-center justify-center gap-2 bg-spartan-card text-spartan-text font-bold py-3 px-4 rounded-lg hover:bg-spartan-border transition-colors"
            >
              <HomeIcon className="w-5 h-5" />
              Ir al inicio
            </button>
          </div>
          
          {/* Help Text */}
          <p className="text-xs text-spartan-text-secondary mt-6">
            Si el problema persiste, puedes contactar con nuestro equipo de soporte técnico.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AiErrorScreen;
