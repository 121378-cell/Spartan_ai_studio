import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { logger } from '../utils/logger';
import { searchExercisesByMuscle, getNutritionInfo } from '../services/fitnessNutritionService.ts';
import type { ExerciseDetail, NutritionInfo } from '../types.ts';
import { useSpecificLoadingState } from '../context/LoadingStateContext';
import DetailedLoadingIndicator from './DetailedLoadingIndicator';
import { DetailedLoadingState } from './DetailedLoadingState';

const FitnessNutritionDemo: React.FC = () => {
  const { userProfile } = useAppContext();
  const [exercises, setExercises] = useState<ExerciseDetail[]>([]);
  const [nutritionInfo, setNutritionInfo] = useState<NutritionInfo[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState('biceps');
  const [foodItems, setFoodItems] = useState('100g chicken breast, 1 apple');
  
  // Loading states for each operation
  const { loadingState: exerciseSearchState, setState: setExerciseSearchState } = useSpecificLoadingState('exerciseSearch');
  const { loadingState: nutritionSearchState, setState: setNutritionSearchState } = useSpecificLoadingState('nutritionSearch');

  useEffect(() => {
    // Load initial data
    loadExercises();
  }, []);

  const loadExercises = async () => {
    setExerciseSearchState(DetailedLoadingState.INITIATED, 'Initializing exercise search');
    
    try {
      // Simulate connecting state
      setExerciseSearchState(DetailedLoadingState.CONNECTING, 'Connecting to exercise database');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Simulate sending state
      setExerciseSearchState(DetailedLoadingState.SENDING, 'Sending search query');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate waiting state
      setExerciseSearchState(DetailedLoadingState.WAITING, 'Searching exercises');
      const results = await searchExercisesByMuscle(selectedMuscle);
      
      // Simulate receiving state
      setExerciseSearchState(DetailedLoadingState.RECEIVING, 'Receiving exercise data');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Simulate processing state
      setExerciseSearchState(DetailedLoadingState.PROCESSING, 'Processing exercise data');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Completed
      setExerciseSearchState(DetailedLoadingState.COMPLETED, `Found ${results.length} exercises`);
      setExercises(results);
      
      // Clear state after 2 seconds
      setTimeout(() => setExerciseSearchState(DetailedLoadingState.IDLE, ''), 2000);
    } catch (error) {
      setExerciseSearchState(DetailedLoadingState.FAILED, 'Failed to search exercises', 0, (error as Error).message);
      logger.error('Error loading exercises:', { metadata: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  const loadNutritionInfo = async () => {
    setNutritionSearchState(DetailedLoadingState.INITIATED, 'Initializing nutrition search');
    
    try {
      // Simulate connecting state
      setNutritionSearchState(DetailedLoadingState.CONNECTING, 'Connecting to nutrition database');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Simulate sending state
      setNutritionSearchState(DetailedLoadingState.SENDING, 'Sending nutrition query');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate waiting state
      setNutritionSearchState(DetailedLoadingState.WAITING, 'Searching nutrition data');
      const items = foodItems.split(',').map(item => item.trim());
      const results = await getNutritionInfo(items);
      
      // Simulate receiving state
      setNutritionSearchState(DetailedLoadingState.RECEIVING, 'Receiving nutrition data');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Simulate processing state
      setNutritionSearchState(DetailedLoadingState.PROCESSING, 'Processing nutrition data');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Completed
      setNutritionSearchState(DetailedLoadingState.COMPLETED, `Found nutrition info for ${results.length} items`);
      setNutritionInfo(results);
      
      // Clear state after 2 seconds
      setTimeout(() => setNutritionSearchState(DetailedLoadingState.IDLE, ''), 2000);
    } catch (error) {
      setNutritionSearchState(DetailedLoadingState.FAILED, 'Failed to search nutrition info', 0, (error as Error).message);
      logger.error('Error loading nutrition info:', { metadata: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-spartan-gold mb-6">Fitness & Nutrition API Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Exercises Section */}
        <div className="bg-spartan-card rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-spartan-text mb-4">Exercise Database</h2>
          
          <div className="mb-4">
            <label className="block text-spartan-text mb-2">Select Muscle Group:</label>
            <select 
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value)}
              className="w-full p-2 rounded bg-spartan-background text-spartan-text border border-spartan-border"
            >
              <option value="biceps">Biceps</option>
              <option value="triceps">Triceps</option>
              <option value="chest">Chest</option>
              <option value="back">Back</option>
              <option value="legs">Legs</option>
              <option value="shoulders">Shoulders</option>
              <option value="abdominals">Abdominals</option>
            </select>
          </div>
          
          <button 
            onClick={loadExercises}
            disabled={exerciseSearchState.state !== DetailedLoadingState.IDLE}
            className="bg-spartan-gold text-spartan-dark font-bold py-2 px-4 rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50"
          >
            {exerciseSearchState.state !== DetailedLoadingState.IDLE ? 'Searching...' : 'Search Exercises'}
          </button>
          
          {exerciseSearchState.state !== DetailedLoadingState.IDLE && (
            <div className="my-4">
              <DetailedLoadingIndicator loadingState={exerciseSearchState} />
            </div>
          )}
          
          {exercises.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-spartan-text mb-2">
                Found {exercises.length} exercises for {selectedMuscle}
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {exercises.map((exercise, index) => (
                  <div key={index} className="bg-spartan-background p-3 rounded-lg border border-spartan-border">
                    <h4 className="font-bold text-spartan-text">{exercise.name}</h4>
                    <p className="text-sm text-spartan-muted mt-1">
                      <span className="font-medium">Type:</span> {exercise.type} | 
                      <span className="font-medium">Difficulty:</span> {exercise.difficulty}
                    </p>
                    {typeof exercise.equipment === 'string' ? (
                      <p className="text-sm text-spartan-muted">
                        <span className="font-medium">Equipment:</span> {exercise.equipment}
                      </p>
                    ) : (
                      <p className="text-sm text-spartan-muted">
                        <span className="font-medium">Equipment:</span> {exercise.equipment.join(', ')}
                      </p>
                    )}
                    <p className="text-sm mt-2">{exercise.instructions}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Nutrition Section */}
        <div className="bg-spartan-card rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-spartan-text mb-4">Nutrition Database</h2>
          
          <div className="mb-4">
            <label className="block text-spartan-text mb-2">Food Items (comma separated):</label>
            <textarea
              value={foodItems}
              onChange={(e) => setFoodItems(e.target.value)}
              className="w-full p-2 rounded bg-spartan-background text-spartan-text border border-spartan-border"
              rows={3}
              placeholder="e.g., 100g chicken breast, 1 apple, 1 cup rice"
            />
          </div>
          
          <button 
            onClick={loadNutritionInfo}
            disabled={nutritionSearchState.state !== DetailedLoadingState.IDLE}
            className="bg-spartan-gold text-spartan-dark font-bold py-2 px-4 rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50"
          >
            {nutritionSearchState.state !== DetailedLoadingState.IDLE ? 'Searching...' : 'Get Nutrition Info'}
          </button>
          
          {nutritionSearchState.state !== DetailedLoadingState.IDLE && (
            <div className="my-4">
              <DetailedLoadingIndicator loadingState={nutritionSearchState} />
            </div>
          )}
          
          {nutritionInfo.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-spartan-text mb-2">
                Nutrition Information
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {nutritionInfo.map((item, index) => (
                  <div key={index} className="bg-spartan-background p-3 rounded-lg border border-spartan-border">
                    <h4 className="font-bold text-spartan-text">{item.foodName}</h4>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-sm">
                        <span className="font-medium">Calories:</span> {item.calories}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Protein:</span> {item.protein}g
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Carbs:</span> {item.carbs}g
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Fat:</span> {item.fat}g
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-spartan-card rounded-xl border border-spartan-border">
        <h3 className="text-xl font-bold text-spartan-text mb-2">API Integration Status</h3>
        <p className="text-spartan-text">
          This demo shows how the Spartan Hub application can integrate with free fitness and nutrition APIs.
          To use the actual APIs, you need to configure API keys in your environment variables.
          See <code className="bg-spartan-background px-1 rounded">FITNESS_NUTRITION_APIS.md</code> for setup instructions.
        </p>
      </div>
    </div>
  );
};

export default FitnessNutritionDemo;

