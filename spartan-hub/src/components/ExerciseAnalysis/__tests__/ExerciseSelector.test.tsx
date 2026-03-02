/**
 * Exercise Selector Component Tests
 * Phase B: Additional Exercises
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExerciseSelector } from '../ExerciseAnalysis/ExerciseSelector';
import { EXERCISE_DATABASE } from '../../types/exercises';

describe('ExerciseSelector', () => {
  it('should render all exercises by default', () => {
    render(<ExerciseSelector />);
    
    EXERCISE_DATABASE.forEach((exercise) => {
      expect(screen.getByText(exercise.name)).toBeInTheDocument();
    });
  });

  it('should filter by category', async () => {
    render(<ExerciseSelector />);
    
    const legsFilter = screen.getByTestId('category-filter-legs');
    fireEvent.click(legsFilter);
    
    await waitFor(() => {
      expect(screen.getByText(/1 exercise found/)).toBeInTheDocument();
    });
  });

  it('should filter by difficulty', async () => {
    render(<ExerciseSelector />);
    
    const advancedFilter = screen.getByTestId('difficulty-filter-advanced');
    fireEvent.click(advancedFilter);
    
    await waitFor(() => {
      expect(screen.getByText(/1 exercise found/)).toBeInTheDocument();
    });
  });

  it('should search exercises', async () => {
    render(<ExerciseSelector />);
    
    const searchInput = screen.getByTestId('exercise-search');
    fireEvent.change(searchInput, { target: { value: 'squat' } });
    
    await waitFor(() => {
      expect(screen.getByText(/1 exercise found/)).toBeInTheDocument();
      expect(screen.getByText('Barbell Squat')).toBeInTheDocument();
    });
  });

  it('should clear filters', async () => {
    render(<ExerciseSelector />);
    
    // Apply filter
    const legsFilter = screen.getByTestId('category-filter-legs');
    fireEvent.click(legsFilter);
    
    await waitFor(() => {
      expect(screen.getByText(/1 exercise found/)).toBeInTheDocument();
    });
    
    // Clear filters
    const clearButton = screen.getByTestId('clear-filters');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(screen.getByText(/4 exercises found/)).toBeInTheDocument();
    });
  });

  it('should show empty state when no results', async () => {
    render(<ExerciseSelector />);
    
    const searchInput = screen.getByTestId('exercise-search');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    await waitFor(() => {
      expect(screen.getByText('No exercises found')).toBeInTheDocument();
    });
  });

  it('should call onSelect when exercise is selected', () => {
    const onSelect = jest.fn();
    render(<ExerciseSelector onSelect={onSelect} />);
    
    const firstCard = screen.getByTestId('exercise-card-squat');
    fireEvent.click(firstCard);
    
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'squat' })
    );
  });

  it('should respect compact mode', () => {
    render(<ExerciseSelector compact={true} />);
    
    // Compact mode should have different layout
    expect(screen.getByTestId('exercise-selector-compact')).toBeInTheDocument();
  });

  it('should hide filters when showFilters is false', () => {
    render(<ExerciseSelector showFilters={false} />);
    
    expect(screen.queryByTestId('exercise-filters')).not.toBeInTheDocument();
    expect(screen.queryByTestId('exercise-search')).not.toBeInTheDocument();
  });
});
