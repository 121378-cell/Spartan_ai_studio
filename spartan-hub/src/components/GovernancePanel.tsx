import React, { useState } from 'react';
import axios from 'axios';

interface Decision {
  decision: string;
  confidence: number;
  reasoning: string;
  model_used: string;
  processing_time: number;
  timestamp: string;
}

interface GovernanceProps {
  baseUrl: string;
}

const GovernancePanel: React.FC<GovernanceProps> = ({ baseUrl }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);

  const evaluateTraining = async (context: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${baseUrl}/api/governance/training`,
        context
      );
      setDecision(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error evaluando entrenamiento');
    } finally {
      setLoading(false);
    }
  };

  const evaluateHealth = async (context: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${baseUrl}/api/governance/health`,
        context
      );
      setDecision(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error evaluando salud');
    } finally {
      setLoading(false);
    }
  };

  const renderDecision = () => {
    if (!decision) return null;

    const getDecisionColor = () => {
      switch (decision.decision) {
        case 'APPROVE': return 'text-green-600';
        case 'REJECT': return 'text-red-600';
        default: return 'text-yellow-600';
      }
    };

    return (
      <div className="bg-white shadow rounded-lg p-6 mt-4">
        <h3 className={`text-xl font-bold ${getDecisionColor()}`}>
          {decision.decision}
        </h3>
        <div className="mt-2 text-gray-600">
          <p><strong>Confianza:</strong> {(decision.confidence * 100).toFixed(1)}%</p>
          <p><strong>Modelo:</strong> {decision.model_used}</p>
          <p><strong>Tiempo:</strong> {decision.processing_time.toFixed(2)}s</p>
        </div>
        <div className="mt-4">
          <h4 className="font-semibold">Razonamiento:</h4>
          <p className="text-gray-700 whitespace-pre-wrap">{decision.reasoning}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Panel de Gobernanza IA</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-xl font-semibold mb-3">Evaluación de Entrenamiento</h3>
          <button
            onClick={() => evaluateTraining({
              user_level: "intermediate",
              exercise: "deadlift",
              weight: "100kg",
              sets: 5,
              reps: 5
            })}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Evaluar Plan
          </button>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="text-xl font-semibold mb-3">Evaluación de Salud</h3>
          <button
            onClick={() => evaluateHealth({
              heart_rate: 150,
              blood_pressure: "120/80",
              perceived_effort: 8,
              reported_pain: null
            })}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            Evaluar Estado
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {renderDecision()}
    </div>
  );
};

export default GovernancePanel;
