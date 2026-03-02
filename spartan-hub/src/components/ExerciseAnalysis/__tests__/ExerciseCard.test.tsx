/**
 * Exercise Card Component Tests
 * Phase B: Additional Exercises
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseCard } from '../ExerciseCard';
import { ExerciseDefinition } from '../../../types/exercises';

const mockExercise: ExerciseDefinition = {
  id: 'bench_press',
  name: 'Barbell Bench Press',
  description: 'The premier upper body pushing exercise',
  category: 'chest',
  difficulty: 'intermediate',
  primaryMuscles: ['pectorals', 'triceps'],
  secondaryMuscles: ['anterior deltoids'],
  equipment: ['barbell', 'bench'],
  instructions: ['Lie on bench', 'Lower bar to chest', 'Press up'],
  tips: ['Keep elbows at 45-75°', 'Maintain slight arch']
};

describe('ExerciseCard', () => {
  it('should render exercise information', () => {
    render(<ExerciseCard exercise={mockExercise} />);
    
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
    expect(screen.getByText(/premier upper body/)).toBeInTheDocument();
    expect(screen.getByText('intermediate')).toBeInTheDocument();
  });

  it('should display primary muscles', () => {
    render(<ExerciseCard exercise={mockExercise} />);
    
    expect(screen.getByText('pectorals')).toBeInTheDocument();
    expect(screen.getByText('triceps')).toBeInTheDocument();
  });

  it('should display equipment', () => {
    render(<ExerciseCard exercise={mockExercise} />);
    
    expect(screen.getByText(/barbell, bench/)).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<ExerciseCard exercise={mockExercise} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByTestId('exercise-card-bench_press'));
    
    expect(onSelect).toHaveBeenCalledWith(mockExercise);
  });

  it('should show selected state', () => {
    render(
      <ExerciseCard 
        exercise={mockExercise} 
        selected={true} 
        onSelect={() => {}}
      />
    );
    
    expect(screen.getByText('Selected ✓')).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    const onSelect = jest.fn();
    render(<ExerciseCard exercise={mockExercise} onSelect={onSelect} />);
    
    const card = screen.getByTestId('exercise-card-bench_press');
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
    
    expect(onSelect).toHaveBeenCalledWith(mockExercise);
  });

  it('should render compact variant', () => {
    render(<ExerciseCard exercise={mockExercise} compact={true} />);
    
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
    expect(screen.getByText('intermediate')).toBeInTheDocument();
  });

  it('should have proper ARIA labels', () => {
    render(<ExerciseCard exercise={mockExercise} onSelect={() => {}} />);
    
    expect(screen.getByTestId('exercise-card-bench_press'))
      .toHaveAttribute('aria-label', 'Select Barbell Bench Press exercise');
  });
});
