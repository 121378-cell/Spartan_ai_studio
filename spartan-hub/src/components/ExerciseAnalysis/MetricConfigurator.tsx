/**
 * Metric Configurator Component
 * Phase B: Additional Exercises
 * 
 * Configure custom metrics for exercises
 */

import React, { useState, useCallback } from 'react';

export interface CustomMetric {
  id: string;
  name: string;
  type: 'angle' | 'distance' | 'quality' | 'boolean';
  unit?: string;
  min?: number;
  max?: number;
  ideal?: number;
  warningThreshold?: number;
}

interface MetricConfiguratorProps {
  metrics?: CustomMetric[];
  onChange?: (metrics: CustomMetric[]) => void;
}

export const MetricConfigurator: React.FC<MetricConfiguratorProps> = ({
  metrics = [],
  onChange
}) => {
  const [localMetrics, setLocalMetrics] = useState<CustomMetric[]>(metrics);

  const addMetric = useCallback(() => {
    const newMetric: CustomMetric = {
      id: `metric-${Date.now()}`,
      name: 'New Metric',
      type: 'angle',
      unit: 'degrees',
      min: 0,
      max: 180,
      ideal: 90,
      warningThreshold: 15
    };
    
    const updated = [...localMetrics, newMetric];
    setLocalMetrics(updated);
    onChange?.(updated);
  }, [localMetrics, onChange]);

  const updateMetric = useCallback((id: string, updates: Partial<CustomMetric>) => {
    const updated = localMetrics.map(m => 
      m.id === id ? { ...m, ...updates } : m
    );
    setLocalMetrics(updated);
    onChange?.(updated);
  }, [localMetrics, onChange]);

  const removeMetric = useCallback((id: string) => {
    const updated = localMetrics.filter(m => m.id !== id);
    setLocalMetrics(updated);
    onChange?.(updated);
  }, [localMetrics, onChange]);

  return (
    <div className="space-y-4" data-testid="metric-configurator">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Custom Metrics
        </h3>
        <button
          onClick={addMetric}
          className="px-4 py-2 bg-spartan-primary text-white rounded-lg hover:bg-spartan-primary/90 transition-colors text-sm font-medium"
          aria-label="Add new metric"
          data-testid="add-metric-button"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Metric
          </span>
        </button>
      </div>

      {localMetrics.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No metrics configured yet</p>
          <p className="text-sm mt-1">Click "Add Metric" to create your first metric</p>
        </div>
      ) : (
        <div className="space-y-4">
          {localMetrics.map((metric, index) => (
            <div
              key={metric.id}
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
              data-testid={`metric-item-${metric.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 bg-spartan-primary/10 text-spartan-primary rounded-full text-sm font-bold">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={metric.name}
                    onChange={(e) => updateMetric(metric.id, { name: e.target.value })}
                    className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-spartan-primary focus:outline-none"
                    aria-label="Metric name"
                  />
                </div>
                <button
                  onClick={() => removeMetric(metric.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Remove metric"
                  data-testid={`remove-metric-${metric.id}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Metric Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Type
                  </label>
                  <select
                    value={metric.type}
                    onChange={(e) => updateMetric(metric.id, { type: e.target.value as CustomMetric['type'] })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    aria-label="Metric type"
                  >
                    <option value="angle">Angle</option>
                    <option value="distance">Distance</option>
                    <option value="quality">Quality</option>
                    <option value="boolean">Yes/No</option>
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={metric.unit || ''}
                    onChange={(e) => updateMetric(metric.id, { unit: e.target.value })}
                    placeholder={metric.type === 'angle' ? 'degrees' : metric.type === 'distance' ? 'cm' : ''}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    aria-label="Metric unit"
                  />
                </div>

                {/* Ideal Value */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Ideal Value
                  </label>
                  <input
                    type="number"
                    value={metric.ideal || ''}
                    onChange={(e) => updateMetric(metric.id, { ideal: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    aria-label="Ideal value"
                  />
                </div>

                {/* Min Value */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Min
                  </label>
                  <input
                    type="number"
                    value={metric.min || ''}
                    onChange={(e) => updateMetric(metric.id, { min: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    aria-label="Minimum value"
                  />
                </div>

                {/* Max Value */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Max
                  </label>
                  <input
                    type="number"
                    value={metric.max || ''}
                    onChange={(e) => updateMetric(metric.id, { max: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    aria-label="Maximum value"
                  />
                </div>

                {/* Warning Threshold */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Warning Threshold
                  </label>
                  <input
                    type="number"
                    value={metric.warningThreshold || ''}
                    onChange={(e) => updateMetric(metric.id, { warningThreshold: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    aria-label="Warning threshold"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MetricConfigurator;
