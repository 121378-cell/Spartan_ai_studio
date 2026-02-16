import React from 'react';
import type { RoutineBlock } from '../types.ts';

interface TrainingBlockProps {
  block: RoutineBlock;
}

// This is a placeholder component that is not currently used in the main application flow.
// It could be used in the future to render individual blocks of a workout.
const TrainingBlock: React.FC<TrainingBlockProps> = ({ block }) => {
  return (
    <div className="bg-spartan-card p-4 rounded-lg">
      <h3 className="text-xl font-bold text-spartan-gold">{block.name}</h3>
      <ul className="mt-2 space-y-1">
        {block.exercises.map((ex, index) => (
          <li key={index} className="text-sm text-spartan-text-secondary">
            {ex.name}: {ex.sets}x{ex.reps}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TrainingBlock;

