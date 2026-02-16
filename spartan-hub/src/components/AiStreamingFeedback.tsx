import React, { useState, useEffect } from 'react';

interface AiStreamingFeedbackProps {
  isActive: boolean;
  progress?: number;
  status?: 'thinking' | 'processing' | 'responding' | 'completed' | 'error';
  message?: string;
}

const AiStreamingFeedback: React.FC<AiStreamingFeedbackProps> = ({ 
  isActive, 
  progress = 0, 
  status = 'thinking',
  message 
}) => {
  const [dots, setDots] = useState('');

  // Animation for the thinking indicator
  useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  const getStatusColor = () => {
    switch (status) {
      case 'thinking': return 'bg-blue-500';
      case 'processing': return 'bg-yellow-500';
      case 'responding': return 'bg-green-500';
      case 'completed': return 'bg-green-600';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusMessage = () => {
    if (message) return message;
    
    switch (status) {
      case 'thinking': return `Pensando${dots}`;
      case 'processing': return `Procesando${dots}`;
      case 'responding': return `Respondiendo${dots}`;
      case 'completed': return '¡Completado!';
      case 'error': return 'Error en el proceso';
      default: return `Procesando${dots}`;
    }
  };

  return (
    <div className="fixed bottom-24 left-8 z-50 w-full max-w-sm bg-spartan-surface rounded-lg shadow-2xl p-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${status !== 'completed' && status !== 'error' ? 'animate-pulse' : ''}`}></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-spartan-text truncate">
            {getStatusMessage()}
          </p>
          {progress > 0 && progress < 100 && (
            <div className="mt-2 w-full bg-spartan-border rounded-full h-2">
              <div 
                className="bg-spartan-gold h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiStreamingFeedback;
