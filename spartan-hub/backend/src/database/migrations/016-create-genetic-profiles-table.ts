/**
 * Migration: Create Genetic Profiles Table
 * 
 * Stores genetic data from 23andMe/Ancestry and analysis results
 */

import { Database } from 'sqlite3';

export const up = async (db: Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS genetic_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('23andme', 'ancestry', 'manual')),
        imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_analyzed_at DATETIME,
        raw_data TEXT, -- Compressed/stored separately in production
        analysis_json TEXT NOT NULL, -- JSON string with all analysis
        privacy_consent BOOLEAN DEFAULT TRUE,
        data_retention_days INTEGER DEFAULT 3650, -- 10 years
        allow_research_use BOOLEAN DEFAULT FALSE,
        anonymized_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Create table for individual variants
        db.run(`
          CREATE TABLE IF NOT EXISTS genetic_variants (
            id TEXT PRIMARY KEY,
            profile_id TEXT NOT NULL,
            gene TEXT NOT NULL,
            rsid TEXT NOT NULL,
            genotype TEXT NOT NULL,
            chromosome TEXT,
            position INTEGER,
            confidence INTEGER DEFAULT 95,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (profile_id) REFERENCES genetic_profiles(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            // Create indexes
            db.run(`
              CREATE INDEX IF NOT EXISTS idx_genetic_profiles_user 
              ON genetic_profiles(user_id)
            `, (err) => {
              if (err) {
                reject(err);
              } else {
                db.run(`
                  CREATE INDEX IF NOT EXISTS idx_genetic_variants_profile 
                  ON genetic_variants(profile_id)
                `, (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    db.run(`
                      CREATE INDEX IF NOT EXISTS idx_genetic_variants_rsid 
                      ON genetic_variants(rsid)
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
    db.run('DROP TABLE IF EXISTS genetic_variants', (err) => {
      if (err) {
        reject(err);
      } else {
        db.run('DROP TABLE IF EXISTS genetic_profiles', (err) => {
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
