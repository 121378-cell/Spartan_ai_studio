/**
 * Migration: Create Team Challenges Tables
 *
 * Stores challenges, teams, participants, and leaderboards
 */

import { Database } from 'sqlite3';

export const up = async (db: Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Challenges table
    db.run(`
      CREATE TABLE IF NOT EXISTS challenges (
        id TEXT PRIMARY KEY,
        creator_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('steps', 'workouts', 'consistency', 'distance', 'calories', 'custom')),
        title TEXT NOT NULL,
        description TEXT,
        goal_metric TEXT NOT NULL,
        goal_target INTEGER NOT NULL,
        goal_unit TEXT NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        timezone TEXT DEFAULT 'UTC',
        visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'invite_only')),
        max_participants INTEGER,
        min_participants INTEGER DEFAULT 2,
        reward_type TEXT,
        reward_description TEXT,
        reward_value INTEGER,
        rules TEXT, -- JSON array
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
        total_participants INTEGER DEFAULT 0,
        completion_rate REAL DEFAULT 0,
        average_progress REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Teams table
        db.run(`
          CREATE TABLE IF NOT EXISTS challenge_teams (
            id TEXT PRIMARY KEY,
            challenge_id TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT,
            captain_id TEXT NOT NULL,
            members TEXT NOT NULL, -- JSON array of user IDs
            total_progress INTEGER DEFAULT 0,
            average_progress REAL DEFAULT 0,
            rank INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
            FOREIGN KEY (captain_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            // Participants table
            db.run(`
              CREATE TABLE IF NOT EXISTS challenge_participants (
                id TEXT PRIMARY KEY,
                challenge_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                team_id TEXT,
                status TEXT DEFAULT 'joined' CHECK (status IN ('invited', 'joined', 'active', 'completed', 'dropped')),
                progress REAL DEFAULT 0,
                current_value INTEGER DEFAULT 0,
                rank INTEGER,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                streak_days INTEGER DEFAULT 0,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (team_id) REFERENCES challenge_teams(id) ON DELETE SET NULL
              )
            `, (err) => {
              if (err) {
                reject(err);
              } else {
                // Create indexes
                db.run(`CREATE INDEX IF NOT EXISTS idx_challenges_creator ON challenges(creator_id)`, (err) => {
                  if (err) reject(err);
                  else db.run(`CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status)`, (err) => {
                    if (err) reject(err);
                    else db.run(`CREATE INDEX IF NOT EXISTS idx_teams_challenge ON challenge_teams(challenge_id)`, (err) => {
                      if (err) reject(err);
                      else db.run(`CREATE INDEX IF NOT EXISTS idx_participants_challenge ON challenge_participants(challenge_id)`, (err) => {
                        if (err) reject(err);
                        else db.run(`CREATE INDEX IF NOT EXISTS idx_participants_user ON challenge_participants(user_id)`, (err) => {
                          if (err) reject(err);
                          else resolve();
                        });
                      });
                    });
                  });
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
    db.run('DROP TABLE IF EXISTS challenge_participants', (err) => {
      if (err) reject(err);
      else db.run('DROP TABLE IF EXISTS challenge_teams', (err) => {
        if (err) reject(err);
        else db.run('DROP TABLE IF EXISTS challenges', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  });
};
