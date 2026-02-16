// Shared constants for Spartan Hub

export const APP_CONSTANTS = {
  // API Configuration
  API_TIMEOUT: 10000,
  MAX_RETRIES: 3,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Cache
  CACHE_TTL: 300, // 5 minutes in seconds
  CACHE_PREFIX: 'spartan_hub:',
  
  // Session
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  
  // Validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_USERNAME_LENGTH: 50,
  MAX_EMAIL_LENGTH: 254,
  
  // File Uploads
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  
  // Workout
  MAX_EXERCISES_PER_WORKOUT: 50,
  MAX_SETS_PER_EXERCISE: 20,
  MAX_REPS_PER_SET: 1000,
  
  // Roles
  ROLES: {
    USER: 'user',
    COACH: 'coach',
    ADMIN: 'admin'
  } as const
} as const;

export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  TOKEN_EXPIRED: 'Session expired',
  TOKEN_INVALID: 'Invalid session token',
  
  // Validation
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_UUID: 'Invalid identifier',
  PASSWORD_TOO_SHORT: `Password must be at least ${APP_CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
  
  // Resources
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',
  
  // Server
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  
  // Business Logic
  WORKOUT_LIMIT_EXCEEDED: `Maximum ${APP_CONSTANTS.MAX_EXERCISES_PER_WORKOUT} exercises allowed per workout`,
  INVALID_DATE: 'Please enter a valid date'
} as const;

export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  PROFILE_UPDATED: 'Profile updated successfully'
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;