/**
 * Migration: Create Accountability Matches Table
 * 
 * Stores workout partner matches and accountability relationships
 */

import { Database } from 'sqlite3';

export const up = async (db: Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS accountability_matches (
        id TEXT PRIMARY KEY,
        user1_id TEXT NOT NULL,
        user2_id TEXT NOT NULL,
        match_score INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'active', 'completed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accepted_at DATETIME,
        current_streak INTEGER DEFAULT 0,
        total_check_ins INTEGER DEFAULT 0,
        last_interaction DATETIME,
        compatibility_factors TEXT, -- JSON string
        suggested_challenges TEXT, -- JSON string
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Create challenges table
        db.run(`
          CREATE TABLE IF NOT EXISTS accountability_challenges (
            id TEXT PRIMARY KEY,
            match_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('daily_checkin', 'workout_together', 'step_competition', 'custom')),
            title TEXT NOT NULL,
            description TEXT,
            start_date DATETIME NOT NULL,
            end_date DATETIME NOT NULL,
            target_value INTEGER NOT NULL,
            unit TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (match_id) REFERENCES accountability_matches(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            // Create challenge participants table
            db.run(`
              CREATE TABLE IF NOT EXISTS challenge_participants (
                id TEXT PRIMARY KEY,
                challenge_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                current_value INTEGER DEFAULT 0,
                completed BOOLEAN DEFAULT FALSE,
                completed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (challenge_id) REFERENCES accountability_challenges(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
              )
            `, (err) => {
              if (err) {
                reject(err);
              } else {
                // Create check-ins table
                db.run(`
                  CREATE TABLE IF NOT EXISTS accountability_checkins (
                    id TEXT PRIMARY KEY,
                    match_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    note TEXT,
                    FOREIGN KEY (match_id) REFERENCES accountability_matches(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                  )
                `, (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    // Create indexes
                    db.run(`
                      CREATE INDEX IF NOT EXISTS idx_accountability_matches_user1 
                      ON accountability_matches(user1_id)
                    `, (err) => {
                      if (err) {
                        reject(err);
                      } else {
                        db.run(`
                          CREATE INDEX IF NOT EXISTS idx_accountability_matches_user2 
                          ON accountability_matches(user2_id)
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
      }
    });
  });
};

export const down = async (db: Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('DROP TABLE IF EXISTS accountability_checkins', (err) => {
      if (err) {
        reject(err);
      } else {
        db.run('DROP TABLE IF EXISTS challenge_participants', (err) => {
          if (err) {
            reject(err);
          } else {
            db.run('DROP TABLE IF EXISTS accountability_challenges', (err) => {
              if (err) {
                reject(err);
              } else {
                db.run('DROP TABLE IF EXISTS accountability_matches', (err) => {
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
  });
};
