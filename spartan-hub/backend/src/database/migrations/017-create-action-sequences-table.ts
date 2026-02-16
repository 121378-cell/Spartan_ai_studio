/**
 * Migration: Create Action Sequences Table
 * 
 * Stores Large Action Model sequences and their execution status
 */

import { Database } from 'sqlite3';

export const up = async (db: Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS action_sequences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        trigger_source TEXT NOT NULL,
        trigger_data TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'executing', 'completed', 'failed', 'cancelled')),
        priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        requires_approval BOOLEAN DEFAULT TRUE,
        user_approved BOOLEAN DEFAULT FALSE,
        metadata TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Create table for individual actions
        db.run(`
          CREATE TABLE IF NOT EXISTS sequence_actions (
            id TEXT PRIMARY KEY,
            sequence_id TEXT NOT NULL,
            action_type TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'skipped')),
            params TEXT NOT NULL,
            result TEXT,
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            depends_on TEXT, -- JSON array of action IDs
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            executed_at DATETIME,
            FOREIGN KEY (sequence_id) REFERENCES action_sequences(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            // Create indexes
            db.run(`
              CREATE INDEX IF NOT EXISTS idx_action_sequences_user 
              ON action_sequences(user_id)
            `, (err) => {
              if (err) {
                reject(err);
              } else {
                db.run(`
                  CREATE INDEX IF NOT EXISTS idx_action_sequences_status 
                  ON action_sequences(status)
                `, (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    db.run(`
                      CREATE INDEX IF NOT EXISTS idx_sequence_actions_sequence 
                      ON sequence_actions(sequence_id)
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
          }
        });
      }
    });
  });
};

export const down = async (db: Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('DROP TABLE IF EXISTS sequence_actions', (err) => {
      if (err) {
        reject(err);
      } else {
        db.run('DROP TABLE IF EXISTS action_sequences', (err) => {
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
