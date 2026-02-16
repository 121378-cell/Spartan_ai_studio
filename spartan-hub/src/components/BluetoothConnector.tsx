import React from 'react';
import { useWearable } from '../context/WearableContext';
import { Bluetooth, BluetoothConnected, BluetoothOff, AlertCircle, Loader2 } from 'lucide-react';

const BluetoothConnector: React.FC = () => {
  const { status, device, lastHeartRate, error, connect, disconnect } = useWearable();

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-spartan-text-secondary';
    }
  };

  const renderStatusIcon = () => {
    switch (status) {
      case 'connected': return <BluetoothConnected className="w-5 h-5" />;
      case 'connecting': return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      default: return <Bluetooth className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-4 bg-spartan-card rounded-lg border border-spartan-border shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={getStatusColor()}>
            {renderStatusIcon()}
          </div>
          <span className="font-bold text-spartan-text">Wearable</span>
        </div>
        <span className={`text-xs uppercase font-bold ${getStatusColor()}`}>
          {status}
        </span>
      </div>

      {status === 'connected' && device && (
        <div className="mb-4 p-3 bg-spartan-surface rounded border border-spartan-border">
          <p className="text-xs text-spartan-text-secondary mb-1">Connected to</p>
          <p className="font-semibold text-spartan-text">{device.name}</p>
          
          {lastHeartRate && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-spartan-gold">
                  {lastHeartRate.heartRate}
                </span>
                <span className="text-[10px] uppercase text-spartan-text-secondary tracking-widest">
                  BPM
                </span>
              </div>
              <div className="h-10 w-24 flex items-end space-x-0.5">
                {/* Simple simulated pulse wave */}
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i}
                    className="bg-spartan-gold w-1 rounded-t-sm animate-pulse"
                    style={{ 
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mb-4 bg-red-500/10 p-2 rounded border border-red-500/20">
          {error}
        </p>
      )}

      <button
        onClick={status === 'connected' ? disconnect : connect}
        disabled={status === 'connecting'}
        className={`w-full py-2 rounded-lg font-bold transition-all ${
          status === 'connected'
            ? 'bg-spartan-surface border border-red-500/50 text-red-500 hover:bg-red-500/10'
            : 'bg-spartan-gold text-spartan-bg hover:opacity-90 shadow-lg shadow-spartan-gold/20'
        } disabled:opacity-50`}
      >
        {status === 'connected' ? 'Desconectar' : 'Conectar Wearable'}
      </button>
    </div>
  );
};

export default BluetoothConnector;
