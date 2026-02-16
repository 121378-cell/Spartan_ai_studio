/**
 * Migration: Create Nutrition Logs Table
 * 
 * Stores food photo analysis results and nutrition tracking data
 */

import { Database } from 'sqlite3';

export const up = async (db: Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS nutrition_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        photo_url TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_calories INTEGER NOT NULL,
        total_protein REAL NOT NULL,
        total_carbs REAL NOT NULL,
        total_fat REAL NOT NULL,
        total_fiber REAL,
        total_sugar REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Create table for individual food items
        db.run(`
          CREATE TABLE IF NOT EXISTS nutrition_log_items (
            id TEXT PRIMARY KEY,
            log_id TEXT NOT NULL,
            food_name TEXT NOT NULL,
            calories INTEGER NOT NULL,
            protein REAL NOT NULL,
            carbs REAL NOT NULL,
            fat REAL NOT NULL,
            fiber REAL,
            sugar REAL,
            serving_size TEXT NOT NULL,
            confidence REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (log_id) REFERENCES nutrition_logs(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            // Create indexes
            db.run(`
              CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date 
              ON nutrition_logs(user_id, timestamp)
            `, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }
        });
      }
    });
  });
};

export const down = async (db: Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('DROP TABLE IF EXISTS nutrition_log_items', (err) => {
      if (err) {
        reject(err);
      } else {
        db.run('DROP TABLE IF EXISTS nutrition_logs', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });
};
