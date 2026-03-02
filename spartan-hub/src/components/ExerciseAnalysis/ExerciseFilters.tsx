/**
 * Exercise Filters Component
 * Phase B: Additional Exercises
 * 
 * Filter exercises by category, difficulty, and search
 */

import React, { useState, useCallback } from 'react';
import { ExerciseFilters as ExerciseFiltersType, ExerciseCategory, ExerciseDifficulty } from '../../types/exercises';

interface ExerciseFiltersProps {
  onFilterChange?: (filters: ExerciseFiltersType) => void;
  initialFilters?: ExerciseFiltersType;
}

export const ExerciseFilters: React.FC<ExerciseFiltersProps> = ({
  onFilterChange,
  initialFilters = {}
}) => {
  const [category, setCategory] = useState<ExerciseCategory | undefined>(initialFilters.category);
  const [difficulty, setDifficulty] = useState<ExerciseDifficulty | undefined>(initialFilters.difficulty);
  const [search, setSearch] = useState(initialFilters.search || '');

  const handleCategoryChange = useCallback((newCategory: ExerciseCategory | undefined) => {
    setCategory(newCategory);
    onFilterChange?.({ category: newCategory, difficulty, search });
  }, [difficulty, search, onFilterChange]);

  const handleDifficultyChange = useCallback((newDifficulty: ExerciseDifficulty | undefined) => {
    setDifficulty(newDifficulty);
    onFilterChange?.({ category, difficulty: newDifficulty, search });
  }, [category, search, onFilterChange]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearch(newSearch);
    onFilterChange?.({ category, difficulty, search: newSearch });
  }, [category, difficulty, onFilterChange]);

  const clearFilters = useCallback(() => {
    setCategory(undefined);
    setDifficulty(undefined);
    setSearch('');
    onFilterChange?.({});
  }, [onFilterChange]);

  const categories: { value: ExerciseCategory; label: string; icon: string }[] = [
    { value: 'legs', label: 'Legs', icon: '🦵' },
    { value: 'chest', label: 'Chest', icon: '🏋️' },
    { value: 'shoulders', label: 'Shoulders', icon: '💪' },
    { value: 'back', label: 'Back', icon: '💪' },
    { value: 'full_body', label: 'Full Body', icon: '🤸' }
  ];

  const difficulties: { value: ExerciseDifficulty; label: string; color: string }[] = [
    { value: 'beginner', label: 'Beginner', color: 'text-green-500' },
    { value: 'intermediate', label: 'Intermediate', color: 'text-yellow-500' },
    { value: 'advanced', label: 'Advanced', color: 'text-red-500' }
  ];

  return (
    <div className="space-y-4" data-testid="exercise-filters">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search exercises..."
          className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-spartan-primary focus:border-transparent"
          aria-label="Search exercises"
          data-testid="exercise-search"
        />
        <svg
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Category Filters */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Category
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryChange(category === cat.value ? undefined : cat.value)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${category === cat.value
                  ? 'bg-spartan-primary text-white shadow-md scale-105'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
              aria-pressed={category === cat.value}
              data-testid={`category-filter-${cat.value}`}
            >
              <span className="mr-2">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty Filters */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Difficulty
        </h3>
        <div className="flex flex-wrap gap-2">
          {difficulties.map((diff) => (
            <button
              key={diff.value}
              onClick={() => handleDifficultyChange(difficulty === diff.value ? undefined : diff.value)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${difficulty === diff.value
                  ? `bg-spartan-primary text-white shadow-md scale-105`
                  : `bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700`
                }
              `}
              aria-pressed={difficulty === diff.value}
              data-testid={`difficulty-filter-${diff.value}`}
            >
              <span className={diff.color}>{diff.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {(category || difficulty || search) && (
        <button
          onClick={clearFilters}
          className="text-sm text-spartan-primary hover:text-spartan-primary/80 font-medium"
          aria-label="Clear all filters"
          data-testid="clear-filters"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
};

export default ExerciseFilters;
