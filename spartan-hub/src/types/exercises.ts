/**
 * Exercise Types and Interfaces
 * Phase B: Additional Exercises
 */

export type ExerciseType = 'squat' | 'deadlift' | 'bench_press' | 'overhead_press';

export type ExerciseCategory = 'legs' | 'back' | 'chest' | 'shoulders' | 'full_body';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface ExerciseDefinition {
  id: ExerciseType;
  name: string;
  description: string;
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  instructions: string[];
  tips: string[];
  imageUrl?: string;
  videoUrl?: string;
}

export interface ExerciseFilters {
  category?: ExerciseCategory;
  difficulty?: ExerciseDifficulty;
  search?: string;
}

export const EXERCISE_DATABASE: ExerciseDefinition[] = [
  {
    id: 'squat',
    name: 'Barbell Squat',
    description: 'The king of all exercises. A compound movement that targets the entire lower body.',
    category: 'legs',
    difficulty: 'intermediate',
    primaryMuscles: ['quadriceps', 'glutes', 'hamstrings'],
    secondaryMuscles: ['calves', 'lower back', 'core'],
    equipment: ['barbell', 'squat rack'],
    instructions: [
      'Position the bar on your upper back',
      'Stand with feet shoulder-width apart',
      'Lower your body by bending knees and hips',
      'Keep your chest up and core tight',
      'Descend until thighs are parallel to floor',
      'Push through heels to return to start'
    ],
    tips: [
      'Keep knees in line with toes',
      'Maintain neutral spine throughout',
      'Breathe in on the way down, out on the way up',
      'Start with bodyweight before adding load'
    ]
  },
  {
    id: 'deadlift',
    name: 'Conventional Deadlift',
    description: 'A fundamental pulling exercise that builds total body strength.',
    category: 'full_body',
    difficulty: 'advanced',
    primaryMuscles: ['hamstrings', 'glutes', 'lower back'],
    secondaryMuscles: ['traps', 'lats', 'core', 'forearms'],
    equipment: ['barbell'],
    instructions: [
      'Stand with feet hip-width apart',
      'Grip the bar just outside your knees',
      'Keep your back flat and chest up',
      'Drive through your feet to lift the bar',
      'Keep the bar close to your body',
      'Lock out hips and knees at the top'
    ],
    tips: [
      'Keep the bar close to your shins',
      'Engage your lats before pulling',
      'Breathe and brace before each rep',
      'Never round your lower back'
    ]
  },
  {
    id: 'bench_press',
    name: 'Barbell Bench Press',
    description: 'The premier upper body pushing exercise for chest development.',
    category: 'chest',
    difficulty: 'intermediate',
    primaryMuscles: ['pectorals', 'triceps'],
    secondaryMuscles: ['anterior deltoids', 'core'],
    equipment: ['barbell', 'bench'],
    instructions: [
      'Lie on the bench with feet flat on floor',
      'Grip the bar slightly wider than shoulder-width',
      'Unrack the bar and position over chest',
      'Lower the bar to mid-chest with control',
      'Press the bar back up to start',
      'Keep shoulder blades retracted'
    ],
    tips: [
      'Keep elbows at 45-75° angle from torso',
      'Maintain slight arch in lower back',
      'Touch the bar lightly to chest',
      'Lock out elbows at the top'
    ]
  },
  {
    id: 'overhead_press',
    name: 'Overhead Press (Military Press)',
    description: 'The ultimate shoulder builder and test of upper body strength.',
    category: 'shoulders',
    difficulty: 'intermediate',
    primaryMuscles: ['deltoids', 'triceps'],
    secondaryMuscles: ['upper chest', 'core', 'traps'],
    equipment: ['barbell'],
    instructions: [
      'Stand with feet shoulder-width apart',
      'Grip the bar at shoulder width',
      'Position bar at shoulder height',
      'Brace your core and glutes',
      'Press the bar overhead',
      'Lower with control to start'
    ],
    tips: [
      'Keep elbows slightly in front of bar',
      'Brace core to avoid excessive arch',
      'Breathe in before pressing, out at top',
      'Full lockout at the top'
    ]
  }
];

/**
 * Get exercise by ID
 */
export function getExerciseById(id: ExerciseType): ExerciseDefinition | undefined {
  return EXERCISE_DATABASE.find(ex => ex.id === id);
}

/**
 * Get exercises by category
 */
export function getExercisesByCategory(category: ExerciseCategory): ExerciseDefinition[] {
  return EXERCISE_DATABASE.filter(ex => ex.category === category);
}

/**
 * Get exercises by difficulty
 */
export function getExercisesByDifficulty(difficulty: ExerciseDifficulty): ExerciseDefinition[] {
  return EXERCISE_DATABASE.filter(ex => ex.difficulty === difficulty);
}

/**
 * Filter exercises
 */
export function filterExercises(filters: ExerciseFilters): ExerciseDefinition[] {
  return EXERCISE_DATABASE.filter(exercise => {
    // Category filter
    if (filters.category && exercise.category !== filters.category) {
      return false;
    }
    
    // Difficulty filter
    if (filters.difficulty && exercise.difficulty !== filters.difficulty) {
      return false;
    }
    
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesName = exercise.name.toLowerCase().includes(searchTerm);
      const matchesDescription = exercise.description.toLowerCase().includes(searchTerm);
      const matchesMuscles = exercise.primaryMuscles.some(m => m.toLowerCase().includes(searchTerm));
      
      if (!matchesName && !matchesDescription && !matchesMuscles) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Get exercise icon based on category
 */
export function getExerciseIcon(category: ExerciseCategory): string {
  const icons: Record<ExerciseCategory, string> = {
    legs: '🦵',
    back: '💪',
    chest: '🏋️',
    shoulders: '💪',
    full_body: '🤸'
  };
  
  return icons[category] || '🏋️';
}

/**
 * Get difficulty color
 */
export function getDifficultyColor(difficulty: ExerciseDifficulty): string {
  const colors: Record<ExerciseDifficulty, string> = {
    beginner: 'text-green-500 bg-green-100 dark:bg-green-900/20',
    intermediate: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20',
    advanced: 'text-red-500 bg-red-100 dark:bg-red-900/20'
  };
  
  return colors[difficulty] || colors.intermediate;
}

export default EXERCISE_DATABASE;
