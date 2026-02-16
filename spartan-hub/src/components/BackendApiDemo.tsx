import React, { useState } from 'react';
import { BackendApiService } from '../services/api';
import { useSpecificLoadingState } from '../context/LoadingStateContext';
import DetailedLoadingIndicator from './DetailedLoadingIndicator';
import { DetailedLoadingState } from './DetailedLoadingState';
import { sanitizeInput, sanitizeNumericInput } from '../utils/inputSanitizer';

const BackendApiDemo: React.FC = () => {
  const [userId, setUserId] = useState('user123');
  const [routineId, setRoutineId] = useState('routine456');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [commitmentLevel, setCommitmentLevel] = useState(8);
  const [notes, setNotes] = useState('Feeling motivated');
  const [result, setResult] = useState<any>(null);
  
  // Loading states for each operation
  const { loadingState: assignPlanState, setState: setAssignPlanState } = useSpecificLoadingState('assignPlan');
  const { loadingState: trackCommitmentState, setState: setTrackCommitmentState } = useSpecificLoadingState('trackCommitment');
  const { loadingState: aiAlertState, setState: setAiAlertState } = useSpecificLoadingState('aiAlert');
  const { loadingState: healthCheckState, setState: setHealthCheckState } = useSpecificLoadingState('healthCheck');

  const handleAssignPlan = async () => {
    try {
      // Sanitize inputs before sending to backend
      const sanitizedUserId = sanitizeInput(userId);
      const sanitizedRoutineId = sanitizeInput(routineId);
      const sanitizedStartDate = sanitizeInput(startDate);
      const sanitizedNotes = sanitizeInput(notes);
      
      // Validate required fields
      if (!sanitizedUserId || !sanitizedRoutineId) {
        setResult({ error: 'User ID and Routine ID are required' });
        return;
      }
      
      setAssignPlanState(DetailedLoadingState.SENDING, 'Assigning plan...', 30);
      
      const response = await fetch('/api/assign-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: sanitizedUserId,
          routineId: sanitizedRoutineId,
          startDate: sanitizedStartDate,
          notes: sanitizedNotes
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign plan');
      }
      
      const data = await response.json();
      setAssignPlanState(DetailedLoadingState.COMPLETED, 'Plan assigned successfully', 100);
      setResult(data);
    } catch (error) {
      setAssignPlanState(DetailedLoadingState.FAILED, 'Failed to assign plan', 0, (error as Error).message);
      setResult({ error: (error as Error).message });
    } finally {
      setTimeout(() => setAssignPlanState(DetailedLoadingState.IDLE, ''), 2000);
    }
  };

  const handleTrackCommitment = async () => {
    try {
      // Sanitize inputs
      const sanitizedUserId = sanitizeInput(userId);
      const sanitizedCommitmentLevel = sanitizeNumericInput(commitmentLevel, 1, 10);
      
      // Validate inputs
      if (!sanitizedUserId) {
        setResult({ error: 'User ID is required' });
        return;
      }
      
      if (!sanitizedCommitmentLevel.isValid) {
        setResult({ error: sanitizedCommitmentLevel.error || 'Invalid commitment level' });
        return;
      }
      
      setTrackCommitmentState(DetailedLoadingState.SENDING, 'Tracking commitment...', 30);
      
      const response = await fetch('/api/track-commitment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: sanitizedUserId,
          commitmentLevel: sanitizedCommitmentLevel.value
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to track commitment');
      }
      
      const data = await response.json();
      setTrackCommitmentState(DetailedLoadingState.COMPLETED, 'Commitment tracked successfully', 100);
      setResult(data);
    } catch (error) {
      setTrackCommitmentState(DetailedLoadingState.FAILED, 'Failed to track commitment', 0, (error as Error).message);
      setResult({ error: (error as Error).message });
    } finally {
      setTimeout(() => setTrackCommitmentState(DetailedLoadingState.IDLE, ''), 2000);
    }
  };

  const handleGetAiAlert = async () => {
    setAiAlertState(DetailedLoadingState.INITIATED, 'Initializing AI alert request');
    
    try {
      // Simulate connecting state
      setAiAlertState(DetailedLoadingState.CONNECTING, 'Connecting to AI service');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Simulate sending state
      setAiAlertState(DetailedLoadingState.SENDING, 'Sending alert request');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate waiting state
      setAiAlertState(DetailedLoadingState.WAITING, 'Waiting for AI response');
      const response = await BackendApiService.getAiAlert(userId);
      
      // Simulate receiving state
      setAiAlertState(DetailedLoadingState.RECEIVING, 'Receiving AI response');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Simulate processing state
      setAiAlertState(DetailedLoadingState.PROCESSING, 'Processing AI response');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Completed
      setAiAlertState(DetailedLoadingState.COMPLETED, 'AI alert received successfully');
      setResult(response);
      
      // Clear state after 2 seconds
      setTimeout(() => setAiAlertState(DetailedLoadingState.IDLE, ''), 2000);
    } catch (error) {
      setAiAlertState(DetailedLoadingState.FAILED, 'Failed to get AI alert', 0, (error as Error).message);
      setResult({ error: (error as Error).message });
    }
  };

  const handleHealthCheck = async () => {
    setHealthCheckState(DetailedLoadingState.INITIATED, 'Initializing health check');
    
    try {
      // Simulate connecting state
      setHealthCheckState(DetailedLoadingState.CONNECTING, 'Connecting to health check service');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Simulate sending state
      setHealthCheckState(DetailedLoadingState.SENDING, 'Sending health check request');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate waiting state
      setHealthCheckState(DetailedLoadingState.WAITING, 'Waiting for health check response');
      const backendHealthy = await BackendApiService.healthCheck();
      const aiHealthy = await BackendApiService.aiHealthCheck();
      
      // Simulate receiving state
      setHealthCheckState(DetailedLoadingState.RECEIVING, 'Receiving health check data');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Simulate processing state
      setHealthCheckState(DetailedLoadingState.PROCESSING, 'Processing health check results');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Completed
      setHealthCheckState(DetailedLoadingState.COMPLETED, 'Health check completed successfully');
      setResult({ backendHealthy, aiHealthy });
      
      // Clear state after 2 seconds
      setTimeout(() => setHealthCheckState(DetailedLoadingState.IDLE, ''), 2000);
    } catch (error) {
      setHealthCheckState(DetailedLoadingState.FAILED, 'Health check failed', 0, (error as Error).message);
      setResult({ error: (error as Error).message });
    }
  };

  return (
    <div className="p-4 bg-spartan-card rounded-lg">
      <h2 className="text-xl font-bold mb-4">Backend API Demo</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">User ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full p-2 border border-spartan-border rounded bg-spartan-bg text-spartan-text"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Routine ID</label>
          <input
            type="text"
            value={routineId}
            onChange={(e) => setRoutineId(e.target.value)}
            className="w-full p-2 border border-spartan-border rounded bg-spartan-bg text-spartan-text"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border border-spartan-border rounded bg-spartan-bg text-spartan-text"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Commitment Level (1-10)</label>
          <input
            type="number"
            min="1"
            max="10"
            value={commitmentLevel}
            onChange={(e) => setCommitmentLevel(parseInt(e.target.value))}
            className="w-full p-2 border border-spartan-border rounded bg-spartan-bg text-spartan-text"
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-2 border border-spartan-border rounded bg-spartan-bg text-spartan-text"
          rows={3}
        />
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleAssignPlan}
          disabled={assignPlanState.state !== DetailedLoadingState.IDLE}
          className="px-4 py-2 bg-spartan-gold text-spartan-bg rounded hover:bg-opacity-90 disabled:opacity-50"
        >
          Assign Plan
        </button>
        
        <button
          onClick={handleTrackCommitment}
          disabled={trackCommitmentState.state !== DetailedLoadingState.IDLE}
          className="px-4 py-2 bg-spartan-gold text-spartan-bg rounded hover:bg-opacity-90 disabled:opacity-50"
        >
          Track Commitment
        </button>
        
        <button
          onClick={handleGetAiAlert}
          disabled={aiAlertState.state !== DetailedLoadingState.IDLE}
          className="px-4 py-2 bg-spartan-gold text-spartan-bg rounded hover:bg-opacity-90 disabled:opacity-50"
        >
          Get AI Alert
        </button>
        
        <button
          onClick={handleHealthCheck}
          disabled={healthCheckState.state !== DetailedLoadingState.IDLE}
          className="px-4 py-2 bg-spartan-gold text-spartan-bg rounded hover:bg-opacity-90 disabled:opacity-50"
        >
          Health Check
        </button>
      </div>
      
      {(assignPlanState.state !== DetailedLoadingState.IDLE || 
        trackCommitmentState.state !== DetailedLoadingState.IDLE || 
        aiAlertState.state !== DetailedLoadingState.IDLE || 
        healthCheckState.state !== DetailedLoadingState.IDLE) && (
        <div className="my-4 space-y-6">
          {assignPlanState.state !== DetailedLoadingState.IDLE && (
            <div>
              <h3 className="font-bold text-spartan-text mb-2">Assign Plan Status</h3>
              <DetailedLoadingIndicator loadingState={assignPlanState} />
            </div>
          )}
          
          {trackCommitmentState.state !== DetailedLoadingState.IDLE && (
            <div>
              <h3 className="font-bold text-spartan-text mb-2">Track Commitment Status</h3>
              <DetailedLoadingIndicator loadingState={trackCommitmentState} />
            </div>
          )}
          
          {aiAlertState.state !== DetailedLoadingState.IDLE && (
            <div>
              <h3 className="font-bold text-spartan-text mb-2">AI Alert Status</h3>
              <DetailedLoadingIndicator loadingState={aiAlertState} />
            </div>
          )}
          
          {healthCheckState.state !== DetailedLoadingState.IDLE && (
            <div>
              <h3 className="font-bold text-spartan-text mb-2">Health Check Status</h3>
              <DetailedLoadingIndicator loadingState={healthCheckState} />
            </div>
          )}
        </div>
      )}
      
      {result && (
        <div className="mt-4 p-4 bg-spartan-surface rounded">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="text-sm overflow-auto max-h-60">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default BackendApiDemo;
