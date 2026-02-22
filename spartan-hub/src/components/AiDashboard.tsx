import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Cpu, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Database,
  Clock,
  Settings
} from 'lucide-react';
import BackendApiService from '../services/api';
import { logger } from '../utils/logger';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface ProviderStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  latency: number;
  lastCheck: string;
  circuitBreaker: 'closed' | 'open' | 'half_open';
}

const AiDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<boolean | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [configReloadMessage, setConfigReloadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Mock data for visual demonstration until backend exposes detailed provider stats
  const [providers, setProviders] = useState<ProviderStatus[]>([
    { id: 'groq', name: 'Groq (Llama 3)', status: 'online', latency: 120, lastCheck: new Date().toISOString(), circuitBreaker: 'closed' },
    { id: 'openai', name: 'OpenAI (GPT-4o)', status: 'online', latency: 450, lastCheck: new Date().toISOString(), circuitBreaker: 'closed' },
    { id: 'anthropic', name: 'Anthropic (Claude)', status: 'offline', latency: 0, lastCheck: new Date().toISOString(), circuitBreaker: 'open' },
    { id: 'microservice', name: 'Ollama (Local)', status: 'online', latency: 25, lastCheck: new Date().toISOString(), circuitBreaker: 'closed' },
  ]);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      // Parallel data fetching
      const [health, stats] = await Promise.all([
        BackendApiService.aiHealthCheck(),
        BackendApiService.getAiQueueStats().catch(() => null)
      ]);

      setHealthStatus(health);
      if (stats) setQueueStats(stats);
      
      // Update timestamps for mock data
      setProviders(prev => prev.map(p => ({ ...p, lastCheck: new Date().toISOString() })));

    } catch (error) {
      logger.error('Error fetching AI dashboard data', { context: 'AiDashboard', error });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleReloadConfig = async () => {
    try {
      setRefreshing(true);
      const result = await BackendApiService.reloadAiConfig();
      setConfigReloadMessage({ type: 'success', text: result.message });
      setTimeout(() => setConfigReloadMessage(null), 5000);
      await fetchData();
    } catch (error) {
      setConfigReloadMessage({ type: 'error', text: 'Failed to reload configuration' });
      setTimeout(() => setConfigReloadMessage(null), 5000);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'offline': return 'text-red-500';
      case 'degraded': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getCircuitColor = (status: string) => {
    switch (status) {
      case 'closed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'open': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'half_open': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-spartan-gold flex items-center gap-3">
            <Cpu className="w-8 h-8" />
            AI Governance Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Real-time monitoring of AI Infrastructure & Cascading Failover System</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleReloadConfig}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg border border-blue-600/30 transition-all"
            disabled={refreshing}
          >
            <Settings className="w-4 h-4" />
            Reload Config
          </button>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-all"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {configReloadMessage && (
        <div className={`p-4 rounded-lg border ${
          configReloadMessage.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        } mb-6 flex items-center gap-3`}>
          {configReloadMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {configReloadMessage.text}
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* System Health */}
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">System Health</p>
              <h3 className="text-2xl font-bold mt-1 text-white">
                {healthStatus === null ? 'Checking...' : (healthStatus ? 'Operational' : 'Critical')}
              </h3>
            </div>
            <Activity className={`w-8 h-8 ${healthStatus ? 'text-green-500' : 'text-red-500'}`} />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className={`w-2 h-2 rounded-full ${healthStatus ? 'bg-green-500' : 'bg-red-500'}`}></div>
            Global AI Service Status
          </div>
        </div>

        {/* Active Queue */}
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">Queue Status</p>
              <h3 className="text-2xl font-bold mt-1 text-white">
                {queueStats ? queueStats.active + queueStats.waiting : 0}
              </h3>
            </div>
            <Database className="w-8 h-8 text-blue-500" />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="text-yellow-400">{queueStats?.waiting || 0} waiting</span>
            <span className="text-green-400">{queueStats?.active || 0} active</span>
          </div>
        </div>

        {/* Total Processed */}
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">Processed Jobs</p>
              <h3 className="text-2xl font-bold mt-1 text-white">
                {queueStats?.completed || 0}
              </h3>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-500" />
          </div>
          <div className="text-sm text-gray-400">
            Total successful inferences
          </div>
        </div>

        {/* Failures */}
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">Failures</p>
              <h3 className="text-2xl font-bold mt-1 text-red-400">
                {queueStats?.failed || 0}
              </h3>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div className="text-sm text-gray-400">
            Jobs failed processing
          </div>
        </div>
      </div>

      {/* Provider Status Table */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-700/50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-spartan-gold" />
            AI Provider Status (Cascading Hierarchy)
          </h2>
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
            Auto-refresh: 30s
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/50 text-gray-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Provider</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Latency</th>
                <th className="p-4 font-semibold">Circuit Breaker</th>
                <th className="p-4 font-semibold">Last Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="p-4 font-medium text-white flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(provider.status).replace('text-', 'bg-')}`}></div>
                    {provider.name}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      provider.status === 'online' ? 'bg-green-900/30 text-green-400' : 
                      provider.status === 'offline' ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'
                    }`}>
                      {provider.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300 font-mono">
                    {provider.latency > 0 ? `${provider.latency}ms` : '-'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border ${getCircuitColor(provider.circuitBreaker)}`}>
                      {provider.circuitBreaker === 'closed' && <CheckCircle className="w-3 h-3" />}
                      {provider.circuitBreaker === 'open' && <XCircle className="w-3 h-3" />}
                      {provider.circuitBreaker === 'half_open' && <RefreshCw className="w-3 h-3" />}
                      {provider.circuitBreaker.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-sm flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {new Date(provider.lastCheck).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AiDashboard;
