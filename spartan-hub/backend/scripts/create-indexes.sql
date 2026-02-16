-- Database Index Creation Script for Spartan Hub
-- Optimizes query performance for core application workflows
-- Run this script on your database to create recommended indexes

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Workouts table indexes  
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_scheduled_date ON workouts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);
CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON workouts(created_at);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, scheduled_date DESC);

-- Exercises table indexes
CREATE INDEX IF NOT EXISTS idx_exercises_workout_id ON exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_exercises_exercise_name ON exercises(exercise_name);
CREATE INDEX IF NOT EXISTS idx_exercises_created_at ON exercises(created_at);

-- Sets table indexes
CREATE INDEX IF NOT EXISTS idx_sets_exercise_id ON sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_sets_created_at ON sets(created_at);

-- Workout logs indexes
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_workout_id ON workout_logs(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_completed_at ON workout_logs(completed_at);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_completed ON workout_logs(user_id, completed_at DESC);

-- AI interactions indexes
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_interaction_type ON ai_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at ON ai_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_type ON ai_interactions(user_id, interaction_type);

-- User goals indexes
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_target_date ON user_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_user_goals_created_at ON user_goals(created_at);

-- User progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_metric_type ON user_progress(metric_type);
CREATE INDEX IF NOT EXISTS idx_user_progress_recorded_at ON user_progress(recorded_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_metric ON user_progress(user_id, metric_type, recorded_at DESC);

-- Compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_workouts_user_status_date ON workouts(user_id, status, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_exercises_workout_name ON exercises(workout_id, exercise_name);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, DATE(completed_at));
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_type_date ON ai_interactions(user_id, interaction_type, created_at DESC);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);

-- Foreign key constraint indexes (automatically created in most databases)
-- These are included for completeness and manual verification
CREATE INDEX IF NOT EXISTS idx_exercises_workout_fk ON exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_sets_exercise_fk ON sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_workout_fk ON workout_logs(workout_id);

-- Performance monitoring: Query to check index usage
/*
SELECT 
    tbl_name,
    stat
FROM sqlite_stat1 
WHERE tbl_name IN ('users', 'workouts', 'exercises', 'sets', 'workout_logs', 'ai_interactions');

-- Check query execution plans
EXPLAIN QUERY PLAN SELECT * FROM workouts WHERE user_id = ? AND scheduled_date >= ? ORDER BY scheduled_date DESC LIMIT 10;
*/