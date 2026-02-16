/**
 * Migration: Create Expert Marketplace Tables
 * 
 * Stores expert profiles, content, subscriptions, and reviews
 */

import { Database } from 'sqlite3';

export const up = async (db: Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Experts table
    db.run(`
      CREATE TABLE IF NOT EXISTS experts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        bio TEXT,
        specialties TEXT, -- JSON array
        certifications TEXT, -- JSON array
        years_experience INTEGER,
        avatar TEXT,
        social_links TEXT, -- JSON object
        total_subscribers INTEGER DEFAULT 0,
        total_content INTEGER DEFAULT 0,
        average_rating REAL DEFAULT 0,
        total_revenue INTEGER DEFAULT 0,
        subscription_price INTEGER NOT NULL,
        is_accepting_subscribers BOOLEAN DEFAULT FALSE,
        commission_rate INTEGER DEFAULT 25,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
        verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'premium')),
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Content table
        db.run(`
          CREATE TABLE IF NOT EXISTS expert_content (
            id TEXT PRIMARY KEY,
            expert_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('routine', 'program', 'tutorial', 'meal_plan', 'guide')),
            title TEXT NOT NULL,
            description TEXT,
            content TEXT NOT NULL, -- JSON
            metadata TEXT NOT NULL, -- JSON
            is_premium BOOLEAN DEFAULT FALSE,
            price INTEGER,
            included_in_subscription BOOLEAN DEFAULT TRUE,
            views INTEGER DEFAULT 0,
            downloads INTEGER DEFAULT 0,
            rating REAL DEFAULT 0,
            review_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            // Subscriptions table
            db.run(`
              CREATE TABLE IF NOT EXISTS expert_subscriptions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expert_id TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
                plan TEXT NOT NULL CHECK (plan IN ('monthly', 'quarterly', 'yearly')),
                price INTEGER NOT NULL,
                start_date DATETIME NOT NULL,
                end_date DATETIME NOT NULL,
                auto_renew BOOLEAN DEFAULT TRUE,
                payment_method TEXT,
                cancellation_date DATETIME,
                cancellation_reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE
              )
            `, (err) => {
              if (err) {
                reject(err);
              } else {
                // Reviews table
                db.run(`
                  CREATE TABLE IF NOT EXISTS expert_reviews (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    expert_id TEXT NOT NULL,
                    content_id TEXT,
                    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                    comment TEXT,
                    is_verified_purchase BOOLEAN DEFAULT FALSE,
                    helpful_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
                    FOREIGN KEY (content_id) REFERENCES expert_content(id) ON DELETE CASCADE
                  )
                `, (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    // Revenue transactions table
                    db.run(`
                      CREATE TABLE IF NOT EXISTS revenue_transactions (
                        id TEXT PRIMARY KEY,
                        expert_id TEXT NOT NULL,
                        type TEXT NOT NULL CHECK (type IN ('subscription', 'content_sale', 'tip')),
                        amount INTEGER NOT NULL,
                        platform_fee INTEGER NOT NULL,
                        net_amount INTEGER NOT NULL,
                        user_id TEXT NOT NULL,
                        description TEXT,
                        status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        settled_at DATETIME,
                        FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                      )
                    `, (err) => {
                      if (err) {
                        reject(err);
                      } else {
                        // Create indexes
                        db.run(`CREATE INDEX IF NOT EXISTS idx_experts_user ON experts(user_id)`, (err) => {
                          if (err) reject(err);
                          else db.run(`CREATE INDEX IF NOT EXISTS idx_experts_status ON experts(status)`, (err) => {
                            if (err) reject(err);
                            else db.run(`CREATE INDEX IF NOT EXISTS idx_content_expert ON expert_content(expert_id)`, (err) => {
                              if (err) reject(err);
                              else db.run(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON expert_subscriptions(user_id)`, (err) => {
                                if (err) reject(err);
                                else db.run(`CREATE INDEX IF NOT EXISTS idx_subscriptions_expert ON expert_subscriptions(expert_id)`, (err) => {
                                  if (err) reject(err);
                                  else db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_expert ON expert_reviews(expert_id)`, (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                  });
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
          }
        });
      }
    });
  });
};

export const down = async (db: Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('DROP TABLE IF EXISTS revenue_transactions', (err) => {
      if (err) reject(err);
      else db.run('DROP TABLE IF EXISTS expert_reviews', (err) => {
        if (err) reject(err);
        else db.run('DROP TABLE IF EXISTS expert_subscriptions', (err) => {
          if (err) reject(err);
          else db.run('DROP TABLE IF EXISTS expert_content', (err) => {
            if (err) reject(err);
            else db.run('DROP TABLE IF EXISTS experts', (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });
      });
    });
  });
};
