/**
 * Exercise Card Component
 * Phase B: Additional Exercises
 * 
 * Displays individual exercise information
 */

import React from 'react';
import { ExerciseDefinition, getExerciseIcon, getDifficultyColor } from '../../types/exercises';

interface ExerciseCardProps {
  exercise: ExerciseDefinition;
  onSelect?: (exercise: ExerciseDefinition) => void;
  selected?: boolean;
  compact?: boolean;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onSelect,
  selected = false,
  compact = false
}) => {
  const icon = getExerciseIcon(exercise.category);
  const difficultyClass = getDifficultyColor(exercise.difficulty);

  const handleClick = () => {
    if (onSelect) {
      onSelect(exercise);
    }
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={`
          flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
          ${selected 
            ? 'bg-spartan-primary text-white shadow-lg scale-105' 
            : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        aria-label={`Select ${exercise.name}`}
        data-testid={`exercise-card-${exercise.id}`}
      >
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{exercise.name}</h3>
          <p className={`text-xs ${selected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
            {exercise.difficulty}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`
        p-6 rounded-xl cursor-pointer transition-all duration-200
        ${selected
          ? 'bg-gradient-to-br from-spartan-primary to-spartan-gold text-white shadow-xl scale-105'
          : 'bg-white dark:bg-gray-900 hover:shadow-lg hover:scale-102 border border-gray-200 dark:border-gray-800'
        }
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`Select ${exercise.name} exercise`}
      data-testid={`exercise-card-${exercise.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden="true">{icon}</span>
          <div>
            <h3 className="font-bold text-lg">{exercise.name}</h3>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${difficultyClass}`}>
              {exercise.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className={`text-sm mb-4 ${selected ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
        {exercise.description}
      </p>

      {/* Primary Muscles */}
      <div className="mb-4">
        <h4 className={`text-xs font-semibold uppercase mb-2 ${selected ? 'text-white/70' : 'text-gray-500 dark:text-gray-500'}`}>
          Target Muscles
        </h4>
        <div className="flex flex-wrap gap-2">
          {exercise.primaryMuscles.slice(0, 3).map((muscle) => (
            <span
              key={muscle}
              className={`px-2 py-1 rounded text-xs ${
                selected
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {muscle}
            </span>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>{exercise.equipment.join(', ')}</span>
      </div>

      {/* Action Button */}
      {onSelect && (
        <button
          className={`
            w-full mt-4 py-2 px-4 rounded-lg font-medium transition-colors
            ${selected
              ? 'bg-white text-spartan-primary hover:bg-white/90'
              : 'bg-spartan-primary text-white hover:bg-spartan-primary/90'
            }
          `}
          aria-label={`Start ${exercise.name} analysis`}
        >
          {selected ? 'Selected ✓' : 'Start Analysis'}
        </button>
      )}
    </div>
  );
};

export default ExerciseCard;
