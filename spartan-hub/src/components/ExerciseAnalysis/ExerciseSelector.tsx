/**
 * Exercise Selector Component
 * Phase B: Additional Exercises
 * 
 * Main component for selecting exercises with filtering
 */

import React, { useState, useMemo } from 'react';
import { ExerciseDefinition, filterExercises, EXERCISE_DATABASE } from '../../types/exercises';
import ExerciseCard from './ExerciseCard';
import ExerciseFilters from './ExerciseFilters';

interface ExerciseSelectorProps {
  onSelect?: (exercise: ExerciseDefinition) => void;
  selectedExercise?: ExerciseDefinition;
  showFilters?: boolean;
  compact?: boolean;
}

export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  onSelect,
  selectedExercise,
  showFilters = true,
  compact = false
}) => {
  const [filters, setFilters] = useState({});

  const filteredExercises = useMemo(() => {
    return filterExercises(filters);
  }, [filters]);

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleExerciseSelect = (exercise: ExerciseDefinition) => {
    if (onSelect) {
      onSelect(exercise);
    }
  };

  if (compact) {
    return (
      <div className="space-y-2" data-testid="exercise-selector-compact">
        {EXERCISE_DATABASE.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onSelect={handleExerciseSelect}
            selected={selectedExercise?.id === exercise.id}
            compact={compact}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="exercise-selector">
      {/* Filters */}
      {showFilters && (
        <ExerciseFilters
          onFilterChange={handleFilterChange}
          initialFilters={filters}
        />
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Exercise Grid */}
      {filteredExercises.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onSelect={handleExerciseSelect}
              selected={selectedExercise?.id === exercise.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            No exercises found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your filters or search term.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExerciseSelector;
