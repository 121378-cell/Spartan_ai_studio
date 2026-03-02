/**
 * Exercise Creator Component
 * Phase B: Additional Exercises
 * 
 * Create custom exercises with personalized metrics
 */

import React, { useState, useCallback } from 'react';
import { ExerciseDefinition, ExerciseCategory, ExerciseDifficulty } from '../../types/exercises';
import MetricConfigurator, { CustomMetric } from './MetricConfigurator';

interface ExerciseCreatorProps {
  onSave?: (exercise: ExerciseDefinition) => void;
  onCancel?: () => void;
}

export const ExerciseCreator: React.FC<ExerciseCreatorProps> = ({
  onSave,
  onCancel
}) => {
  const [step, setStep] = useState(1);
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    description: '',
    category: 'full_body' as ExerciseCategory,
    difficulty: 'intermediate' as ExerciseDifficulty
  });
  const [muscles, setMuscles] = useState({
    primary: [] as string[],
    secondary: [] as string[]
  });
  const [equipment, setEquipment] = useState<string[]>([]);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [tips, setTips] = useState<string[]>(['']);
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);

  const handleBasicInfoChange = (field: string, value: string) => {
    setBasicInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleMuscleChange = (type: 'primary' | 'secondary', value: string) => {
    const muscles = value.split(',').map(m => m.trim()).filter(m => m);
    setMuscles(prev => ({ ...prev, [type]: muscles }));
  };

  const handleEquipmentChange = (value: string) => {
    const items = value.split(',').map(e => e.trim()).filter(e => e);
    setEquipment(items);
  };

  const handleInstructionChange = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleTipChange = (index: number, value: string) => {
    const updated = [...tips];
    updated[index] = value;
    setTips(updated);
  };

  const addTip = () => {
    setTips([...tips, '']);
  };

  const removeTip = (index: number) => {
    setTips(tips.filter((_, i) => i !== index));
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 1:
        return !!(basicInfo.name && basicInfo.description);
      case 2:
        return muscles.primary.length > 0;
      case 3:
        return instructions.some(i => i.trim());
      case 4:
        return true; // Metrics are optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSave = () => {
    if (!validateStep()) return;

    const exercise: ExerciseDefinition = {
      id: `custom_${basicInfo.name.toLowerCase().replace(/\s+/g, '_')}` as any,
      name: basicInfo.name,
      description: basicInfo.description,
      category: basicInfo.category,
      difficulty: basicInfo.difficulty,
      primaryMuscles: muscles.primary,
      secondaryMuscles: muscles.secondary,
      equipment,
      instructions: instructions.filter(i => i.trim()),
      tips: tips.filter(t => t.trim()),
      imageUrl: undefined,
      videoUrl: undefined
    };

    onSave?.(exercise);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8" data-testid="step-indicator">
      {[1, 2, 3, 4].map((s) => (
        <React.Fragment key={s}>
          <div
            className={`
              flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all
              ${s === step
                ? 'bg-spartan-primary text-white scale-110'
                : s < step
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }
            `}
            aria-label={`Step ${s}`}
          >
            {s < step ? '✓' : s}
          </div>
          {s < 4 && (
            <div
              className={`w-16 h-1 mx-2 transition-all ${
                s < step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto" data-testid="exercise-creator">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Create Custom Exercise
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Define your own exercise with custom metrics and form guidelines
      </p>

      {renderStepIndicator()}

      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Basic Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Exercise Name *
              </label>
              <input
                type="text"
                value={basicInfo.name}
                onChange={(e) => handleBasicInfoChange('name', e.target.value)}
                placeholder="e.g., Bulgarian Split Squat"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-spartan-primary focus:border-transparent"
                aria-label="Exercise name"
                data-testid="exercise-name-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={basicInfo.description}
                onChange={(e) => handleBasicInfoChange('description', e.target.value)}
                placeholder="Describe the exercise..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-spartan-primary focus:border-transparent"
                aria-label="Exercise description"
                data-testid="exercise-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={basicInfo.category}
                  onChange={(e) => handleBasicInfoChange('category', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-spartan-primary focus:border-transparent"
                  aria-label="Exercise category"
                >
                  <option value="legs">Legs</option>
                  <option value="chest">Chest</option>
                  <option value="shoulders">Shoulders</option>
                  <option value="back">Back</option>
                  <option value="full_body">Full Body</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty
                </label>
                <select
                  value={basicInfo.difficulty}
                  onChange={(e) => handleBasicInfoChange('difficulty', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-spartan-primary focus:border-transparent"
                  aria-label="Exercise difficulty"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Muscles & Equipment */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Target Muscles & Equipment
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Primary Muscles *
              </label>
              <input
                type="text"
                value={muscles.primary.join(', ')}
                onChange={(e) => handleMuscleChange('primary', e.target.value)}
                placeholder="e.g., quadriceps, glutes, hamstrings"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-spartan-primary focus:border-transparent"
                aria-label="Primary muscles"
                data-testid="primary-muscles-input"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Separate multiple muscles with commas
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Secondary Muscles
              </label>
              <input
                type="text"
                value={muscles.secondary.join(', ')}
                onChange={(e) => handleMuscleChange('secondary', e.target.value)}
                placeholder="e.g., calves, core"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-spartan-primary focus:border-transparent"
                aria-label="Secondary muscles"
                data-testid="secondary-muscles-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Equipment Needed
              </label>
              <input
                type="text"
                value={equipment.join(', ')}
                onChange={(e) => handleEquipmentChange(e.target.value)}
                placeholder="e.g., barbell, dumbbells, bench"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-spartan-primary focus:border-transparent"
                aria-label="Equipment"
                data-testid="equipment-input"
              />
            </div>
          </div>
        )}

        {/* Step 3: Instructions & Tips */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Instructions & Tips
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Step-by-Step Instructions *
              </label>
              <div className="space-y-3">
                {instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-3">
                    <span className="flex items-center justify-center w-8 h-10 bg-spartan-primary/10 text-spartan-primary rounded-full text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={instruction}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      placeholder={`Step ${index + 1}...`}
                      className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-spartan-primary focus:border-transparent"
                      aria-label={`Instruction ${index + 1}`}
                    />
                    {instructions.length > 1 && (
                      <button
                        onClick={() => removeInstruction(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Remove instruction"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addInstruction}
                className="mt-3 text-sm text-spartan-primary hover:text-spartan-primary/80 font-medium"
                aria-label="Add instruction"
                data-testid="add-instruction-button"
              >
                + Add another step
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pro Tips
              </label>
              <div className="space-y-3">
                {tips.map((tip, index) => (
                  <div key={index} className="flex gap-3">
                    <span className="flex items-center justify-center w-8 h-10 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-full text-sm font-bold flex-shrink-0">
                      💡
                    </span>
                    <input
                      type="text"
                      value={tip}
                      onChange={(e) => handleTipChange(index, e.target.value)}
                      placeholder="Pro tip..."
                      className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-spartan-primary focus:border-transparent"
                      aria-label={`Tip ${index + 1}`}
                    />
                    {tips.length > 1 && (
                      <button
                        onClick={() => removeTip(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Remove tip"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addTip}
                className="mt-3 text-sm text-spartan-primary hover:text-spartan-primary/80 font-medium"
                aria-label="Add tip"
                data-testid="add-tip-button"
              >
                + Add another tip
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Custom Metrics */}
        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Custom Metrics (Optional)
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Define custom metrics to track for this exercise. This is optional - you can skip if you want to use default metrics.
            </p>
            
            <MetricConfigurator
              metrics={customMetrics}
              onChange={setCustomMetrics}
            />
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
              aria-label="Go back"
              data-testid="back-button"
            >
              ← Back
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
              aria-label="Cancel"
              data-testid="cancel-button"
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={!validateStep()}
              className="px-6 py-3 bg-spartan-primary text-white rounded-lg hover:bg-spartan-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              aria-label="Continue to next step"
              data-testid="next-button"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition-colors"
              aria-label="Save exercise"
              data-testid="save-button"
            >
              ✓ Save Exercise
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseCreator;
