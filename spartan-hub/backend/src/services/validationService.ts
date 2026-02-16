/**
 * Comprehensive input validation service
 * Provides validation functions for all data types in the application
 */

import { 
  UserProfile, 
  EvaluationFormData, 
  Routine, 
  Exercise, 
  WorkoutSession, 
  Trial,
  KeystoneHabit,
  JournalEntry,
  Milestone
} from '../types';
import { GLOBAL_RATE_LIMITER, RateLimiter } from '../utils/rateLimiter';
import { sanitizePlainText, sanitizeLimitedHtml, sanitizeRichText } from '../utils/sanitization';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validation utilities
 */
class ValidationUtils {
  static isString(value: any): value is string {
    return typeof value === 'string';
  }

  static isNumber(value: any): value is number {
    return typeof value === 'number' && !isNaN(value);
  }

  static isBoolean(value: any): value is boolean {
    return typeof value === 'boolean';
  }

  static isArray(value: any): value is any[] {
    return Array.isArray(value);
  }

  static isObject(value: any): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  static isDateString(value: any): boolean {
    return this.isString(value) && !isNaN(Date.parse(value));
  }

  static isEmail(value: any): boolean {
    return this.isString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  static isUrl(value: any): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  static minLength(value: string, min: number): boolean {
    return value.length >= min;
  }

  static maxLength(value: string, max: number): boolean {
    return value.length <= max;
  }

  static minValue(value: number, min: number): boolean {
    return value >= min;
  }

  static maxValue(value: number, max: number): boolean {
    return value <= max;
  }

  static inEnum<T extends string>(value: any, enumValues: readonly T[]): value is T {
    return this.isString(value) && enumValues.includes(value as T);
  }
}

/**
 * Input validation service
 */
export class ValidationService {
  /**
   * Validate user profile data
   */
  static validateUserProfile(profile: any): asserts profile is UserProfile {
    if (!profile) {
      throw new ValidationError('User profile is required');
    }

    if (!ValidationUtils.isObject(profile)) {
      throw new ValidationError('User profile must be an object');
    }

    // Validate required fields
    if (!ValidationUtils.isString(profile.name) || !ValidationUtils.minLength(profile.name, 1)) {
      throw new ValidationError('Name is required and must be at least 1 character long', 'name');
    }

    if (!ValidationUtils.isString(profile.email) || !ValidationUtils.isEmail(profile.email)) {
      throw new ValidationError('Valid email is required', 'email');
    }

    if (!ValidationUtils.isString(profile.quest) || !ValidationUtils.minLength(profile.quest, 5)) {
      throw new ValidationError('Quest is required and must be at least 5 characters long', 'quest');
    }

    // Validate stats object
    if (!ValidationUtils.isObject(profile.stats)) {
      throw new ValidationError('Stats object is required', 'stats');
    }

    if (!ValidationUtils.isNumber(profile.stats.totalWorkouts) || profile.stats.totalWorkouts < 0) {
      throw new ValidationError('Total workouts must be a non-negative number', 'stats.totalWorkouts');
    }

    if (!ValidationUtils.isNumber(profile.stats.currentStreak) || profile.stats.currentStreak < 0) {
      throw new ValidationError('Current streak must be a non-negative number', 'stats.currentStreak');
    }

    if (!ValidationUtils.isDateString(profile.stats.joinDate)) {
      throw new ValidationError('Join date must be a valid date string', 'stats.joinDate');
    }

    // Validate arrays
    if (!ValidationUtils.isArray(profile.trials)) {
      throw new ValidationError('Trials must be an array', 'trials');
    }

    if (!ValidationUtils.isArray(profile.keystoneHabits)) {
      throw new ValidationError('Keystone habits must be an array', 'keystoneHabits');
    }

    if (!ValidationUtils.isArray(profile.reflections)) {
      throw new ValidationError('Reflections must be an array', 'reflections');
    }

    if (!ValidationUtils.isArray(profile.journal)) {
      throw new ValidationError('Journal must be an array', 'journal');
    }

    if (!ValidationUtils.isArray(profile.milestones)) {
      throw new ValidationError('Milestones must be an array', 'milestones');
    }

    // Validate boolean fields
    if (!ValidationUtils.isBoolean(profile.onboardingCompleted)) {
      throw new ValidationError('Onboarding completed must be a boolean', 'onboardingCompleted');
    }

    if (!ValidationUtils.isBoolean(profile.isInAutonomyPhase)) {
      throw new ValidationError('Is in autonomy phase must be a boolean', 'isInAutonomyPhase');
    }

    // Validate optional numeric fields
    if (profile.weightKg !== undefined && (!ValidationUtils.isNumber(profile.weightKg) || profile.weightKg <= 0)) {
      throw new ValidationError('Weight must be a positive number if provided', 'weightKg');
    }

    // Validate training cycle if present
    if (profile.trainingCycle !== undefined) {
      this.validateTrainingCycle(profile.trainingCycle);
    }

    // Validate nested objects
    this.validateMasterRegulationSettings(profile.masterRegulationSettings);
    this.validateNutritionSettings(profile.nutritionSettings);
  }

  /**
   * Validate training cycle data
   */
  static validateTrainingCycle(cycle: any) {
    if (!ValidationUtils.isObject(cycle)) {
      throw new ValidationError('Training cycle must be an object', 'trainingCycle');
    }

    const validPhases = ['adaptation', 'hypertrophy', 'strength'] as const;
    if (!ValidationUtils.inEnum(cycle.phase, validPhases)) {
      throw new ValidationError('Training cycle phase must be one of: adaptation, hypertrophy, strength', 'trainingCycle.phase');
    }

    if (!ValidationUtils.isDateString(cycle.startDate)) {
      throw new ValidationError('Training cycle start date must be a valid date string', 'trainingCycle.startDate');
    }
  }

  /**
   * Validate master regulation settings
   */
  static validateMasterRegulationSettings(settings: any) {
    if (!ValidationUtils.isObject(settings)) {
      throw new ValidationError('Master regulation settings must be an object', 'masterRegulationSettings');
    }

    if (!ValidationUtils.isString(settings.targetBedtime) || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(settings.targetBedtime)) {
      throw new ValidationError('Target bedtime must be in HH:MM format', 'masterRegulationSettings.targetBedtime');
    }
  }

  /**
   * Validate nutrition settings
   */
  static validateNutritionSettings(settings: any) {
    if (!ValidationUtils.isObject(settings)) {
      throw new ValidationError('Nutrition settings must be an object', 'nutritionSettings');
    }

    const validPriorities = ['performance', 'longevity'] as const;
    if (!ValidationUtils.inEnum(settings.priority, validPriorities)) {
      throw new ValidationError('Nutrition priority must be either performance or longevity', 'nutritionSettings.priority');
    }

    if (settings.calorieGoal !== undefined && (!ValidationUtils.isNumber(settings.calorieGoal) || settings.calorieGoal <= 0)) {
      throw new ValidationError('Calorie goal must be a positive number if provided', 'nutritionSettings.calorieGoal');
    }

    if (settings.proteinGoal !== undefined && (!ValidationUtils.isNumber(settings.proteinGoal) || settings.proteinGoal <= 0)) {
      throw new ValidationError('Protein goal must be a positive number if provided', 'nutritionSettings.proteinGoal');
    }
  }

  /**
   * Validate evaluation form data
   */
  static validateEvaluationFormData(data: any): asserts data is EvaluationFormData {
    if (!data) {
      throw new ValidationError('Evaluation form data is required');
    }

    if (!ValidationUtils.isObject(data)) {
      throw new ValidationError('Evaluation form data must be an object');
    }

    // Validate string fields
    const stringFields = [
      { field: 'physicalGoals', min: 5 },
      { field: 'mentalGoals', min: 5 },
      { field: 'equipment', min: 1 },
      { field: 'history', min: 10 },
      { field: 'lifestyle', min: 5 },
      { field: 'painPoint', min: 5 }
    ];

    for (const { field, min } of stringFields) {
      if (!ValidationUtils.isString(data[field]) || !ValidationUtils.minLength(data[field], min)) {
        throw new ValidationError(`${field} is required and must be at least ${min} characters long`, field);
      }
    }

    // Validate experience level
    const validExperienceLevels = ['beginner', 'intermediate', 'advanced'] as const;
    if (!ValidationUtils.inEnum(data.experienceLevel, validExperienceLevels)) {
      throw new ValidationError('Experience level must be beginner, intermediate, or advanced', 'experienceLevel');
    }

    // Validate communication tone
    const validCommunicationTones = ['motivator', 'analytical', 'technical'] as const;
    if (!ValidationUtils.inEnum(data.communicationTone, validCommunicationTones)) {
      throw new ValidationError('Communication tone must be motivator, analytical, or technical', 'communicationTone');
    }

    // Validate nutrition priority
    const validNutritionPriorities = ['performance', 'longevity'] as const;
    if (!ValidationUtils.inEnum(data.nutritionPriority, validNutritionPriorities)) {
      throw new ValidationError('Nutrition priority must be performance or longevity', 'nutritionPriority');
    }

    // Validate numeric fields
    const numericFields = [
      { field: 'weightKg', min: 20, max: 500 },
      { field: 'energyLevel', min: 1, max: 10 },
      { field: 'stressLevel', min: 1, max: 10 },
      { field: 'focusLevel', min: 1, max: 10 },
      { field: 'daysPerWeek', min: 1, max: 7 },
      { field: 'timePerSession', min: 15, max: 180 }
    ];

    for (const { field, min, max } of numericFields) {
      if (!ValidationUtils.isNumber(data[field]) || !ValidationUtils.minValue(data[field], min) || !ValidationUtils.maxValue(data[field], max)) {
        throw new ValidationError(`${field} must be a number between ${min} and ${max}`, field);
      }
    }

    // Validate mobility issues if present
    if (data.activeMobilityIssues !== undefined) {
      if (!ValidationUtils.isArray(data.activeMobilityIssues)) {
        throw new ValidationError('Active mobility issues must be an array if provided', 'activeMobilityIssues');
      }

      const validMobilityIssues = ['tobillo', 'hombro', 'cadera', 'toracica'] as const;
      for (const issue of data.activeMobilityIssues) {
        if (!ValidationUtils.inEnum(issue, validMobilityIssues)) {
          throw new ValidationError(`Invalid mobility issue: ${issue}. Must be one of: ${validMobilityIssues.join(', ')}`, 'activeMobilityIssues');
        }
      }
    }
  }

  /**
   * Validate routine data
   */
  static validateRoutine(routine: any): asserts routine is Routine {
    if (!routine) {
      throw new ValidationError('Routine is required');
    }

    if (!ValidationUtils.isObject(routine)) {
      throw new ValidationError('Routine must be an object');
    }

    // Validate required string fields
    if (!ValidationUtils.isString(routine.id) || !ValidationUtils.minLength(routine.id, 1)) {
      throw new ValidationError('Routine ID is required', 'id');
    }

    if (!ValidationUtils.isString(routine.name) || !ValidationUtils.minLength(routine.name, 1)) {
      throw new ValidationError('Routine name is required', 'name');
    }

    if (!ValidationUtils.isString(routine.focus) || !ValidationUtils.minLength(routine.focus, 1)) {
      throw new ValidationError('Routine focus is required', 'focus');
    }

    // Validate duration
    if (!ValidationUtils.isNumber(routine.duration) || routine.duration <= 0) {
      throw new ValidationError('Routine duration must be a positive number', 'duration');
    }

    // Validate blocks array
    if (!ValidationUtils.isArray(routine.blocks)) {
      throw new ValidationError('Routine blocks must be an array', 'blocks');
    }

    // Validate each block
    for (let i = 0; i < routine.blocks.length; i++) {
      const block = routine.blocks[i];
      if (!ValidationUtils.isObject(block)) {
        throw new ValidationError(`Block ${i} must be an object`, `blocks[${i}]`);
      }

      if (!ValidationUtils.isString(block.name) || !ValidationUtils.minLength(block.name, 1)) {
        throw new ValidationError(`Block ${i} name is required`, `blocks[${i}].name`);
      }

      if (!ValidationUtils.isArray(block.exercises)) {
        throw new ValidationError(`Block ${i} exercises must be an array`, `blocks[${i}].exercises`);
      }

      // Validate each exercise in the block
      for (let j = 0; j < block.exercises.length; j++) {
        this.validateExercise(block.exercises[j], `blocks[${i}].exercises[${j}]`);
      }
    }
  }

  /**
   * Validate exercise data
   */
  static validateExercise(exercise: any, path: string = ''): asserts exercise is Exercise {
    if (!exercise) {
      throw new ValidationError(`${path} Exercise is required`);
    }

    if (!ValidationUtils.isObject(exercise)) {
      throw new ValidationError(`${path} Exercise must be an object`);
    }

    // Validate required fields
    if (!ValidationUtils.isString(exercise.name) || !ValidationUtils.minLength(exercise.name, 1)) {
      throw new ValidationError(`${path} Exercise name is required`, `${path}.name`);
    }

    if (!ValidationUtils.isNumber(exercise.sets) || exercise.sets <= 0) {
      throw new ValidationError(`${path} Exercise sets must be a positive number`, `${path}.sets`);
    }

    if (!ValidationUtils.isString(exercise.reps) || !ValidationUtils.minLength(exercise.reps, 1)) {
      throw new ValidationError(`${path} Exercise reps are required`, `${path}.reps`);
    }

    // Validate optional numeric fields
    if (exercise.rir !== undefined && (!ValidationUtils.isNumber(exercise.rir) || exercise.rir < 0)) {
      throw new ValidationError(`${path} Exercise RIR must be a non-negative number if provided`, `${path}.rir`);
    }

    if (exercise.restSeconds !== undefined && (!ValidationUtils.isNumber(exercise.restSeconds) || exercise.restSeconds < 0)) {
      throw new ValidationError(`${path} Exercise rest seconds must be a non-negative number if provided`, `${path}.restSeconds`);
    }

    // Validate optional string fields
    if (exercise.coachTip !== undefined && !ValidationUtils.isString(exercise.coachTip)) {
      throw new ValidationError(`${path} Exercise coach tip must be a string if provided`, `${path}.coachTip`);
    }

    if (exercise.tempo !== undefined && !ValidationUtils.isString(exercise.tempo)) {
      throw new ValidationError(`${path} Exercise tempo must be a string if provided`, `${path}.tempo`);
    }
  }

  /**
   * Validate workout session data
   */
  static validateWorkoutSession(session: any): asserts session is WorkoutSession {
    if (!session) {
      throw new ValidationError('Workout session is required');
    }

    if (!ValidationUtils.isObject(session)) {
      throw new ValidationError('Workout session must be an object');
    }

    // Validate routine
    try {
      this.validateRoutine(session.routine);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`Invalid routine in session: ${error.message}`, `routine.${error.field}`);
      }
      throw error;
    }

    // Validate progress array structure
    if (!ValidationUtils.isArray(session.progress)) {
      throw new ValidationError('Workout session progress must be an array', 'progress');
    }

    // Validate start time
    if (!ValidationUtils.isNumber(session.startTime) || session.startTime <= 0) {
      throw new ValidationError('Workout session start time must be a positive number', 'startTime');
    }
  }

  /**
   * Validate trial data
   */
  static validateTrial(trial: any): asserts trial is Trial {
    if (!trial) {
      throw new ValidationError('Trial is required');
    }

    if (!ValidationUtils.isObject(trial)) {
      throw new ValidationError('Trial must be an object');
    }

    // Validate required fields
    if (!ValidationUtils.isString(trial.id) || !ValidationUtils.minLength(trial.id, 1)) {
      throw new ValidationError('Trial ID is required', 'id');
    }

    if (!ValidationUtils.isString(trial.title) || !ValidationUtils.minLength(trial.title, 1)) {
      throw new ValidationError('Trial title is required', 'title');
    }

    if (!ValidationUtils.isString(trial.description) || !ValidationUtils.minLength(trial.description, 5)) {
      throw new ValidationError('Trial description is required and must be at least 5 characters', 'description');
    }

    if (!ValidationUtils.isNumber(trial.target) || trial.target <= 0) {
      throw new ValidationError('Trial target must be a positive number', 'target');
    }

    const validUnits = ['kg', 'workouts', 'days'] as const;
    if (!ValidationUtils.inEnum(trial.unit, validUnits)) {
      throw new ValidationError('Trial unit must be kg, workouts, or days', 'unit');
    }
  }

  /**
   * Validate keystone habit data
   */
  static validateKeystoneHabit(habit: any): asserts habit is KeystoneHabit {
    if (!habit) {
      throw new ValidationError('Keystone habit is required');
    }

    if (!ValidationUtils.isObject(habit)) {
      throw new ValidationError('Keystone habit must be an object');
    }

    // Validate required fields
    if (!ValidationUtils.isString(habit.id) || !ValidationUtils.minLength(habit.id, 1)) {
      throw new ValidationError('Habit ID is required', 'id');
    }

    if (!ValidationUtils.isString(habit.name) || !ValidationUtils.minLength(habit.name, 1)) {
      throw new ValidationError('Habit name is required', 'name');
    }

    if (!ValidationUtils.isString(habit.anchor) || !ValidationUtils.minLength(habit.anchor, 1)) {
      throw new ValidationError('Habit anchor is required', 'anchor');
    }

    if (!ValidationUtils.isNumber(habit.currentStreak) || habit.currentStreak < 0) {
      throw new ValidationError('Habit current streak must be a non-negative number', 'currentStreak');
    }

    if (!ValidationUtils.isNumber(habit.longestStreak) || habit.longestStreak < 0) {
      throw new ValidationError('Habit longest streak must be a non-negative number', 'longestStreak');
    }

    // Validate notification time if present
    if (habit.notificationTime !== undefined) {
      if (!ValidationUtils.isString(habit.notificationTime) || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(habit.notificationTime)) {
        throw new ValidationError('Notification time must be in HH:MM format if provided', 'notificationTime');
      }
    }
  }

  /**
   * Validate journal entry data
   */
  static validateJournalEntry(entry: any): asserts entry is JournalEntry {
    if (!entry) {
      throw new ValidationError('Journal entry is required');
    }

    if (!ValidationUtils.isObject(entry)) {
      throw new ValidationError('Journal entry must be an object');
    }

    // Validate required fields
    if (!ValidationUtils.isDateString(entry.date)) {
      throw new ValidationError('Journal entry date must be a valid date string', 'date');
    }

    const validTypes = ['ai_reframing', 'user_reflection'] as const;
    if (!ValidationUtils.inEnum(entry.type, validTypes)) {
      throw new ValidationError('Journal entry type must be ai_reframing or user_reflection', 'type');
    }

    if (!ValidationUtils.isString(entry.title) || !ValidationUtils.minLength(entry.title, 1)) {
      throw new ValidationError('Journal entry title is required', 'title');
    }

    if (!ValidationUtils.isString(entry.body) || !ValidationUtils.minLength(entry.body, 1)) {
      throw new ValidationError('Journal entry body is required', 'body');
    }
  }

  /**
   * Validate milestone data
   */
  static validateMilestone(milestone: any): asserts milestone is Milestone {
    if (!milestone) {
      throw new ValidationError('Milestone is required');
    }

    if (!ValidationUtils.isObject(milestone)) {
      throw new ValidationError('Milestone must be an object');
    }

    // Validate required fields
    if (!ValidationUtils.isString(milestone.id) || !ValidationUtils.minLength(milestone.id, 1)) {
      throw new ValidationError('Milestone ID is required', 'id');
    }

    if (!ValidationUtils.isString(milestone.title) || !ValidationUtils.minLength(milestone.title, 1)) {
      throw new ValidationError('Milestone title is required', 'title');
    }

    if (!ValidationUtils.isString(milestone.description) || !ValidationUtils.minLength(milestone.description, 5)) {
      throw new ValidationError('Milestone description is required and must be at least 5 characters', 'description');
    }

    if (!ValidationUtils.isBoolean(milestone.isCompleted)) {
      throw new ValidationError('Milestone isCompleted must be a boolean', 'isCompleted');
    }
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  static sanitizeInput(input: string, allowedTags: 'none' | 'limited' | 'rich' = 'none'): string {
    // Comprehensive sanitization to prevent XSS and injection attacks using sanitize-html
    switch (allowedTags) {
    case 'limited':
      return sanitizeLimitedHtml(input);
    case 'rich':
      return sanitizeRichText(input);
    case 'none':
    default:
      return sanitizePlainText(input);
    }
  }

  /**
   * Validate and sanitize string input
   */
  static validateAndSanitizeString(input: unknown, fieldName: string, minLength: number = 1, maxLength: number = 1000, allowedTags: 'none' | 'limited' | 'rich' = 'none'): string {
    if (!ValidationUtils.isString(input)) {
      throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }

    if (!ValidationUtils.minLength(input, minLength)) {
      throw new ValidationError(`${fieldName} must be at least ${minLength} characters long`, fieldName);
    }

    if (!ValidationUtils.maxLength(input, maxLength)) {
      throw new ValidationError(`${fieldName} must be no more than ${maxLength} characters long`, fieldName);
    }

    return this.sanitizeInput(input, allowedTags);
  }

  /**
   * Rate limiting validation
   * @param userId User identifier (IP address or user ID)
   * @param maxRequests Maximum requests allowed in the time window
   * @param windowMs Time window in milliseconds
   * @returns Boolean indicating if the request is allowed
   */
  static validateRateLimit(userId: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    // Create a temporary rate limiter for this check
    const rateLimiter = new RateLimiter(maxRequests, windowMs);
    const rateLimitStatus = rateLimiter.checkRateLimit(userId);
    return rateLimitStatus.isAllowed;
  }

  /**
   * Global rate limiting validation using shared rate limiter
   * @param userId User identifier (IP address or user ID)
   * @returns Boolean indicating if the request is allowed
   */
  static validateGlobalRateLimit(userId: string): boolean {
    const rateLimitStatus = GLOBAL_RATE_LIMITER.checkRateLimit(userId);
    return rateLimitStatus.isAllowed;
  }
}

export default ValidationService;