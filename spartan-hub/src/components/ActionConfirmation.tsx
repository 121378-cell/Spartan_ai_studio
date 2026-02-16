/**
 * ActionConfirmation Component
 * 
 * Displays pending autonomous AI actions (LAMs) and allows users
 * to approve or reject them. Shows action sequences with impact
 * analysis and alternatives.
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  ShoppingCart, 
  Activity, 
  Clock,
  Zap,
  RefreshCw
} from 'lucide-react';
import './ActionConfirmation.css';

interface Action {
  id: string;
  type: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  params: Record<string, any>;
}

interface ActionSequence {
  id: string;
  trigger: {
    type: string;
    source: string;
    data: Record<string, any>;
  };
  actions: Action[];
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  requiresApproval: boolean;
  metadata: {
    estimatedImpact: string;
    reason: string;
    alternativeActions?: string[];
  };
}

interface ActionConfirmationProps {
  userId: string;
}

export const ActionConfirmation: React.FC<ActionConfirmationProps> = ({ userId }) => {
  const [pendingSequences, setPendingSequences] = useState<ActionSequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingSequences();
    // Poll for new sequences every 30 seconds
    const interval = setInterval(loadPendingSequences, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadPendingSequences = async () => {
    try {
      const response = await fetch(`/api/lam/pending/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingSequences(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load pending sequences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (sequenceId: string) => {
    setProcessingId(sequenceId);
    try {
      const response = await fetch(`/api/lam/approve/${sequenceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ approved: true })
      });

      if (response.ok) {
        await loadPendingSequences();
      }
    } catch (error) {
      console.error('Failed to approve sequence:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (sequenceId: string) => {
    setProcessingId(sequenceId);
    try {
      const response = await fetch(`/api/lam/approve/${sequenceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ approved: false })
      });

      if (response.ok) {
        await loadPendingSequences();
      }
    } catch (error) {
      console.error('Failed to reject sequence:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'schedule_workout':
      case 'reschedule_workout':
        return <Calendar size={20} />;
      case 'add_grocery_item':
        return <ShoppingCart size={20} />;
      case 'book_recovery_service':
        return <Activity size={20} />;
      case 'adjust_training_plan':
        return <Zap size={20} />;
      case 'update_sleep_schedule':
        return <Clock size={20} />;
      case 'order_supplement':
        return <RefreshCw size={20} />;
      default:
        return <Zap size={20} />;
    }
  };

  const getActionDescription = (action: Action): string => {
    switch (action.type) {
      case 'schedule_workout':
        return `Programar entrenamiento: ${action.params.type} el ${new Date(action.params.date).toLocaleDateString()}`;
      case 'reschedule_workout':
        return `Reprogramar entrenamiento de ${new Date(action.params.originalDate).toLocaleDateString()} al ${new Date(action.params.newDate).toLocaleDateString()}`;
      case 'adjust_training_plan':
        return `Ajustar plan de entrenamiento: ${action.params.adjustment}`;
      case 'book_recovery_service':
        return `Reservar servicio de recuperación: ${action.params.service}`;
      case 'add_grocery_item':
        return `Añadir ${action.params.items?.length || 0} items a lista de compras`;
      case 'order_supplement':
        return `Reordenar suplemento: ${action.params.supplement}`;
      case 'initiate_rest_day':
        return 'Iniciar día de descanso activo';
      case 'update_sleep_schedule':
        return `Actualizar horario de sueño a ${action.params.newBedtime}`;
      default:
        return `${action.type.replace(/_/g, ' ')}`;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'priority-urgent';
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      default:
        return 'priority-low';
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'biometric_alert':
        return '❤️';
      case 'schedule_conflict':
        return '📅';
      case 'goal_milestone':
        return '🏆';
      case 'supplement_low':
        return '💊';
      case 'recovery_needed':
        return '🧘';
      case 'predictive':
        return '🔮';
      default:
        return '⚡';
    }
  };

  if (isLoading) {
    return (
      <div className="action-confirmation-container loading">
        <div className="loading-spinner"></div>
        <p>Cargando acciones pendientes...</p>
      </div>
    );
  }

  if (pendingSequences.length === 0) {
    return (
      <div className="action-confirmation-container empty">
        <div className="empty-state">
          <CheckCircle size={48} className="empty-icon" />
          <h3>No hay acciones pendientes</h3>
          <p>El AI Coach está monitoreando tu progreso y generará acciones automáticas cuando sea necesario.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="action-confirmation-container">
      <div className="action-confirmation-header">
        <h2>
          <Zap size={24} />
          Acciones del AI Coach
        </h2>
        <span className="pending-count">
          {pendingSequences.length} pendiente{pendingSequences.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="sequences-list">
        {pendingSequences.map((sequence) => (
          <div key={sequence.id} className={`sequence-card ${getPriorityColor(sequence.priority)}`}>
            <div className="sequence-header">
              <div className="trigger-info">
                <span className="trigger-icon">{getTriggerIcon(sequence.trigger.type)}</span>
                <div className="trigger-details">
                  <h4>{sequence.trigger.type.replace(/_/g, ' ').toUpperCase()}</h4>
                  <span className="trigger-time">
                    {new Date(sequence.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <span className={`priority-badge ${sequence.priority}`}>
                {sequence.priority}
              </span>
            </div>

            <div className="sequence-reason">
              <p>{sequence.metadata.reason}</p>
            </div>

            <div className="actions-list">
              <h5>Acciones propuestas:</h5>
              {sequence.actions.map((action, idx) => (
                <div key={action.id} className="action-item">
                  <span className="action-number">{idx + 1}</span>
                  <span className="action-icon">{getActionIcon(action.type)}</span>
                  <span className="action-description">
                    {getActionDescription(action)}
                  </span>
                </div>
              ))}
            </div>

            <div className="impact-section">
              <AlertTriangle size={16} />
              <span>Impacto: {sequence.metadata.estimatedImpact}</span>
            </div>

            {sequence.metadata.alternativeActions && sequence.metadata.alternativeActions.length > 0 && (
              <div className="alternatives-section">
                <h5>Alternativas:</h5>
                <ul>
                  {sequence.metadata.alternativeActions.map((alt, idx) => (
                    <li key={idx}>{alt}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="sequence-actions">
              <button
                onClick={() => handleReject(sequence.id)}
                disabled={processingId === sequence.id}
                className="btn-reject"
              >
                <XCircle size={18} />
                {processingId === sequence.id ? 'Procesando...' : 'Rechazar'}
              </button>
              <button
                onClick={() => handleApprove(sequence.id)}
                disabled={processingId === sequence.id}
                className="btn-approve"
              >
                <CheckCircle size={18} />
                {processingId === sequence.id ? 'Procesando...' : 'Aprobar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActionConfirmation;
