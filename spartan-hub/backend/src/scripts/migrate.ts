#!/usr/bin/env ts-node

/**
 * Database Migration Script
 * 
 * This script demonstrates how to handle database migrations.
 * In a production environment, you would use a proper migration framework
 * like node-migrate or umzug, but this simple script shows the concept.
 */

import db from '../config/database';

// Migration to add indexes for better performance
const addIndexes = () => {
  console.log('Adding indexes for better performance...');
  
  try {
    // Type assertion to handle different database types
    const dbInstance = db as any;
    
    // Add index on users.email for faster lookups
    if (dbInstance && typeof dbInstance.exec === 'function') {
      dbInstance.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    }
    
    // Add index on routines.userId for faster lookups
    if (dbInstance && typeof dbInstance.exec === 'function') {
      dbInstance.exec('CREATE INDEX IF NOT EXISTS idx_routines_userId ON routines(userId)');
    }
    
    // Add index on exercises.userId for faster lookups
    if (dbInstance && typeof dbInstance.exec === 'function') {
      dbInstance.exec('CREATE INDEX IF NOT EXISTS idx_exercises_userId ON exercises(userId)');
    }
    
    // Add index on plan_assignments.userId for faster lookups
    if (dbInstance && typeof dbInstance.exec === 'function') {
      dbInstance.exec('CREATE INDEX IF NOT EXISTS idx_plan_assignments_userId ON plan_assignments(userId)');
    }
    
    // Add index on commitments.userId for faster lookups
    if (dbInstance && typeof dbInstance.exec === 'function') {
      dbInstance.exec('CREATE INDEX IF NOT EXISTS idx_commitments_userId ON commitments(userId)');
    }
    
    console.log('Indexes added successfully');
  } catch (error) {
    console.error('Error adding indexes:', error);
  }
};

// Migration to add new columns if needed
const addNewColumns = () => {
  console.log('Adding new columns if needed...');
  
  try {
    // Example: Add a notes column to routines table if it doesn't exist
    // This is a SQLite-specific way to check if a column exists
    const dbInstance = db as any;
    if (dbInstance && typeof dbInstance.prepare === 'function') {
      const routineColumns = dbInstance.prepare('PRAGMA table_info(routines)').all() as any[];
      const hasNotesColumn = routineColumns.some((col: any) => col.name === 'notes');
      
      if (!hasNotesColumn) {
        if (typeof dbInstance.exec === 'function') {
          dbInstance.exec('ALTER TABLE routines ADD COLUMN notes TEXT');
        }
        console.log('Added notes column to routines table');
      } else {
        console.log('Notes column already exists in routines table');
      }
    }
  } catch (error) {
    console.error('Error adding new columns:', error);
  }
};

// Run migrations
const runMigrations = () => {
  console.log('Running database migrations...');
  
  addIndexes();
  addNewColumns();
  
  console.log('Database migrations completed');
};

// If run directly, execute migrations
if (require.main === module) {
  runMigrations();
}

export default runMigrations;