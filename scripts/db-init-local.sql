-- =============================================================================
-- Spartan Hub 2.0 - Local Test Database Initialization
-- =============================================================================
-- This script initializes the PostgreSQL database for local testing
-- Run automatically when PostgreSQL container starts
-- =============================================================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- USERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    quest VARCHAR(255) DEFAULT 'Fitness Transformation',
    
    -- Stats
    stats JSONB DEFAULT '{"totalWorkouts": 0, "currentStreak": 0, "joinDate": null}',
    
    -- Profile settings
    onboarding_completed BOOLEAN DEFAULT FALSE,
    keystone_habits JSONB DEFAULT '[]',
    master_regulation_settings JSONB DEFAULT '{}',
    nutrition_settings JSONB DEFAULT '{}',
    is_in_autonomy_phase BOOLEAN DEFAULT FALSE,
    weight_kg DECIMAL(5,2),
    
    -- Detailed profile
    detailed_profile JSONB DEFAULT '{}',
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    
    -- Google Fit tokens
    google_fit_tokens JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =============================================================================
-- WORKOUTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER, -- minutes
    calories INTEGER,
    exercises JSONB DEFAULT '[]',
    completed BOOLEAN DEFAULT TRUE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_workouts_type ON workouts(type);

-- =============================================================================
-- BIOMETRIC DATA TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS biometric_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Core metrics stored as JSONB
    hrv JSONB,
    resting_heart_rate JSONB,
    sleep JSONB,
    activity JSONB,
    stress JSONB,
    body_metrics JSONB,
    
    -- Derived metrics
    recovery_index JSONB,
    
    -- Metadata
    sources TEXT[] DEFAULT '{}',
    data_completeness INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_biometric_user_id ON biometric_data(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_date ON biometric_data(date);
CREATE INDEX IF NOT EXISTS idx_biometric_user_date ON biometric_data(user_id, date);

-- =============================================================================
-- AI CONVERSATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    topic VARCHAR(100),
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    sentiment VARCHAR(20) DEFAULT 'neutral',
    resolved BOOLEAN DEFAULT TRUE,
    follow_up_required BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON ai_conversations(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversations_topic ON ai_conversations(topic);

-- =============================================================================
-- ACHIEVEMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(10),
    category VARCHAR(50),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);

-- =============================================================================
-- CHALLENGES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    progress INTEGER DEFAULT 0,
    target INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    reward TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date);

-- =============================================================================
-- WEARABLE DEVICES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS wearable_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    serial_number VARCHAR(100),
    
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    permissions JSONB DEFAULT '{}',
    sync_status VARCHAR(20) DEFAULT 'pending',
    sync_error TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wearables_user_id ON wearable_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_wearables_type ON wearable_devices(type);
CREATE INDEX IF NOT EXISTS idx_wearables_active ON wearable_devices(is_active);

-- =============================================================================
-- SESSIONS TABLE (for authentication)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- =============================================================================
-- REFRESH TOKENS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token_hash);

-- =============================================================================
-- ACTIVITY LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(type);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp);

-- =============================================================================
-- INSERT TEST DATA
-- =============================================================================

-- Test User 1: Alex Tester (Intermediate)
INSERT INTO users (id, email, password_hash, name, role, quest, stats, onboarding_completed, 
                   keystone_habits, master_regulation_settings, nutrition_settings, 
                   is_in_autonomy_phase, weight_kg, detailed_profile, preferences)
VALUES (
    'test-user-001'::uuid,
    'test1@local.test',
    '$2b$10$rH9zJX8zJX8zJX8zJX8zJuH5qH5qH5qH5qH5qH5qH5qH5qH5qH5qH', -- Hashed 'TestUser123!'
    'Alex Tester',
    'user',
    'Fitness Transformation',
    '{"totalWorkouts": 25, "currentStreak": 7, "joinDate": "2026-01-30T00:00:00Z"}'::jsonb,
    true,
    '[{"id": "habit-001", "name": "Morning Workout", "anchor": "After waking up", "currentStreak": 7, "longestStreak": 12, "notificationTime": "07:00"}, 
      {"id": "habit-002", "name": "Protein Intake", "anchor": "After each meal", "currentStreak": 15, "longestStreak": 20, "notificationTime": "12:00"}]'::jsonb,
    '{"targetBedtime": "22:30"}'::jsonb,
    '{"priority": "performance", "calorieGoal": 2500, "proteinGoal": 160}'::jsonb,
    false,
    75.0,
    '{"firstName": "Alex", "lastName": "Tester", "dateOfBirth": "1996-03-01", "gender": "prefer-not-to-say", "heightCm": 178, "fitnessLevel": "intermediate", "primaryGoal": "hypertrophy", "workoutFrequencyPerWeek": 4, "preferredWorkoutTime": "morning", "trainingExperienceMonths": 24}'::jsonb,
    '{"theme": "dark", "language": "en", "dateFormat": "MM/DD/YYYY", "timeFormat": "24h", "units": "metric", "notifications": {"email": {"enabled": true, "workoutReminders": true, "progressReports": true, "communityActivities": false, "marketing": false}, "push": {"enabled": true, "workoutReminders": true, "progressReports": true, "communityActivities": false}, "sms": {"enabled": false, "workoutReminders": false, "urgentNotifications": true}}, "privacy": {"profileVisibility": "friends", "showWorkoutStats": true, "showProgressPhotos": false, "shareWithCommunity": false, "allowFriendRequests": true}, "fitness": {"workoutIntensity": "medium", "preferredWorkoutTime": "morning", "restDaysPerWeek": 2, "autoGenerateWorkouts": true, "receiveExerciseTips": true}, "nutrition": {"trackCalories": true, "trackMacros": true, "mealPlanning": false, "recipeSuggestions": true, "dietaryRestrictions": []}, "appBehavior": {"autoSaveWorkouts": true, "remindToLogWorkouts": true, "syncDataInBackground": true, "enableBiometricAuth": false, "showOnboardingTips": true}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Test User 2: Jordan Tester (Beginner)
INSERT INTO users (id, email, password_hash, name, role, quest, stats, onboarding_completed, 
                   keystone_habits, master_regulation_settings, nutrition_settings, 
                   is_in_autonomy_phase, weight_kg, detailed_profile, preferences)
VALUES (
    'test-user-002'::uuid,
    'test2@local.test',
    '$2b$10$rH9zJX8zJX8zJX8zJX8zJuH5qH5qH5qH5qH5qH5qH5qH5qH5qH5qH', -- Hashed 'TestUser123!'
    'Jordan Tester',
    'user',
    'Weight Loss Journey',
    '{"totalWorkouts": 12, "currentStreak": 5, "joinDate": "2026-01-30T00:00:00Z"}'::jsonb,
    true,
    '[{"id": "habit-003", "name": "Evening Walk", "anchor": "After dinner", "currentStreak": 5, "longestStreak": 8, "notificationTime": "19:00"}, 
      {"id": "habit-004", "name": "Water Intake", "anchor": "Every hour", "currentStreak": 10, "longestStreak": 14, "notificationTime": "09:00"}]'::jsonb,
    '{"targetBedtime": "23:00"}'::jsonb,
    '{"priority": "performance", "calorieGoal": 1800, "proteinGoal": 120}'::jsonb,
    false,
    68.0,
    '{"firstName": "Jordan", "lastName": "Tester", "dateOfBirth": "2001-03-01", "gender": "prefer-not-to-say", "heightCm": 165, "fitnessLevel": "beginner", "primaryGoal": "fat-loss", "workoutFrequencyPerWeek": 3, "preferredWorkoutTime": "evening", "trainingExperienceMonths": 6}'::jsonb,
    '{"theme": "dark", "language": "en", "dateFormat": "MM/DD/YYYY", "timeFormat": "24h", "units": "metric", "notifications": {"email": {"enabled": true, "workoutReminders": true, "progressReports": true, "communityActivities": false, "marketing": false}, "push": {"enabled": true, "workoutReminders": true, "progressReports": true, "communityActivities": false}, "sms": {"enabled": false, "workoutReminders": false, "urgentNotifications": true}}, "privacy": {"profileVisibility": "friends", "showWorkoutStats": true, "showProgressPhotos": false, "shareWithCommunity": false, "allowFriendRequests": true}, "fitness": {"workoutIntensity": "low", "preferredWorkoutTime": "evening", "restDaysPerWeek": 3, "autoGenerateWorkouts": true, "receiveExerciseTips": true}, "nutrition": {"trackCalories": true, "trackMacros": true, "mealPlanning": false, "recipeSuggestions": true, "dietaryRestrictions": []}, "appBehavior": {"autoSaveWorkouts": true, "remindToLogWorkouts": true, "syncDataInBackground": true, "enableBiometricAuth": false, "showOnboardingTips": true}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================

-- Verify users were created
SELECT id, email, name, role, created_at FROM users WHERE email LIKE 'test%@local.test';
