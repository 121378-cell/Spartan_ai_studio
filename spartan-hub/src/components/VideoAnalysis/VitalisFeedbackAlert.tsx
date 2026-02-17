import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Info, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ProactiveAlert, coachVitalisClient } from '../../services/coachVitalisClient';

interface VitalisFeedbackAlertProps {
  userId: string;
  formScore?: number;
  exerciseType?: string;
  onDismiss?: (alertId: string) => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const VitalisFeedbackAlert: React.FC<VitalisFeedbackAlertProps> = ({
  userId,
  formScore,
  exerciseType,
  onDismiss,
  autoHide = false,
  autoHideDelay = 10000
}) => {
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const fetchAlerts = useCallback(async () => {
    const fetchedAlerts = await coachVitalisClient.getProactiveAlerts(userId);
    const activeAlerts = fetchedAlerts.filter(
      alert => new Date(alert.expiresAt) > new Date()
    );
    setAlerts(activeAlerts);
  }, [userId]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  useEffect(() => {
    if (formScore !== undefined && formScore < 70) {
      const lowEfficiencyAlert: ProactiveAlert = {
        id: 'low_technical_efficiency_live',
        userId,
        timestamp: new Date(),
        type: 'warning',
        severity: 'urgent',
        title: '🚨 Eficiencia Técnica Baja',
        message: `Tu puntuación de forma actual es ${formScore}. Esto aumenta el riesgo de lesión.`,
        context: {
          triggerReason: 'Form score below 70 during session',
          affectedMetrics: ['Technical Form', 'Injury Risk'],
          confidenceScore: 90
        },
        recommendedAction: {
          action: 'Reduce el peso un 20% y enfócate en tempo controlado (3-0-3-0)',
          expectedBenefit: 'Mejorar patrones de movimiento y proteger articulaciones'
        },
        channels: ['in_app'],
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };
      
      setAlerts(prev => {
        const withoutLive = prev.filter(a => a.id !== 'low_technical_efficiency_live');
        return [lowEfficiencyAlert, ...withoutLive];
      });
    }
  }, [formScore, userId]);

  useEffect(() => {
    if (autoHide && alerts.length > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, alerts.length]);

  const handleDismiss = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    onDismiss?.(alertId);
  };

  const getAlertIcon = (severity: ProactiveAlert['severity']) => {
    switch (severity) {
    case 'critical':
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    case 'urgent':
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    default:
      return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAlertStyles = (severity: ProactiveAlert['severity']) => {
    switch (severity) {
    case 'critical':
      return 'bg-red-50 border-red-300 text-red-900';
    case 'urgent':
      return 'bg-orange-50 border-orange-300 text-orange-900';
    case 'warning':
      return 'bg-yellow-50 border-yellow-300 text-yellow-900';
    default:
      return 'bg-blue-50 border-blue-300 text-blue-900';
    }
  };

  const getTypeIcon = (type: ProactiveAlert['type']) => {
    switch (type) {
    case 'celebration':
      return '🎉';
    case 'intervention':
      return '🔧';
    case 'optimization':
      return '⚡';
    default:
      return '⚠️';
    }
  };

  if (!isVisible || alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`rounded-lg border p-4 transition-all duration-300 ${getAlertStyles(alert.severity)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-xl">{getTypeIcon(alert.type)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {getAlertIcon(alert.severity)}
                  <h4 className="font-semibold">{alert.title}</h4>
                </div>
                <p className="mt-1 text-sm opacity-90">{alert.message}</p>
                
                {expandedAlert === alert.id && (
                  <div className="mt-3 space-y-2 text-sm border-t pt-3">
                    <div>
                      <span className="font-medium">Por qué:</span>{' '}
                      <span className="opacity-80">{alert.context.triggerReason}</span>
                    </div>
                    {alert.recommendedAction && (
                      <div className="bg-white/50 rounded p-2">
                        <span className="font-medium">Acción recomendada:</span>{' '}
                        <span>{alert.recommendedAction.action}</span>
                        {alert.recommendedAction.duration && (
                          <span className="block mt-1 text-xs opacity-70">
                            Duración: {alert.recommendedAction.duration}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs opacity-60">
                      <span>Confianza: {alert.context.confidenceScore}%</span>
                      {exerciseType && <span>• Ejercicio: {exerciseType}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                className="p-1 hover:bg-white/50 rounded transition-colors"
                aria-label={expandedAlert === alert.id ? 'Collapse' : 'Expand'}
              >
                {expandedAlert === alert.id ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleDismiss(alert.id)}
                className="p-1 hover:bg-white/50 rounded transition-colors"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VitalisFeedbackAlert;
