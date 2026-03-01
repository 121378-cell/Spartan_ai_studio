/**
 * Spartan Hub 2.0 - Create Real Users Script
 * For domestic production environment (2 real users)
 * 
 * Usage: npx ts-node scripts/create-real-users.ts
 */

import { DatabaseService } from '../backend/src/services/databaseService';
import { UserService } from '../backend/src/services/userService';
import { TokenService } from '../backend/src/services/tokenService';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production.domestic' });

async function createRealUsers() {
  console.log('🚀 Spartan Hub 2.0 - Creating Real Users...\n');
  
  try {
    // Initialize database
    console.log('📊 Connecting to database...');
    const db = DatabaseService.getInstance();
    await db.connect();
    console.log('✅ Connected to database\n');
    
    // Get user data from environment
    const user1 = {
      email: process.env.PRIMARY_USER_EMAIL || 'user1@local.test',
      name: process.env.PRIMARY_USER_NAME || 'User 1',
      password: process.env.PRIMARY_USER_PASSWORD || 'Password123!',
    };
    
    const user2 = {
      email: process.env.SECONDARY_USER_EMAIL || 'user2@local.test',
      name: process.env.SECONDARY_USER_NAME || 'User 2',
      password: process.env.SECONDARY_USER_PASSWORD || 'Password123!',
    };
    
    // Create User 1
    console.log('👤 Creating User 1...');
    console.log(`   Email: ${user1.email}`);
    console.log(`   Name: ${user1.name}`);
    
    try {
      const createdUser1 = await UserService.create({
        email: user1.email,
        name: user1.name,
        password: user1.password,
        role: 'USER',
      });
      
      console.log('✅ User 1 created successfully');
      console.log(`   ID: ${createdUser1.id}\n`);
    } catch (error: any) {
      if (error.code === '23505') {
        console.log('⚠️  User 1 already exists, skipping...\n');
      } else {
        throw error;
      }
    }
    
    // Create User 2
    console.log('👤 Creating User 2...');
    console.log(`   Email: ${user2.email}`);
    console.log(`   Name: ${user2.name}`);
    
    try {
      const createdUser2 = await UserService.create({
        email: user2.email,
        name: user2.name,
        password: user2.password,
        role: 'USER',
      });
      
      console.log('✅ User 2 created successfully');
      console.log(`   ID: ${createdUser2.id}\n`);
    } catch (error: any) {
      if (error.code === '23505') {
        console.log('⚠️  User 2 already exists, skipping...\n');
      } else {
        throw error;
      }
    }
    
    // Display credentials
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ REAL USERS CREATED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📋 LOGIN CREDENTIALS:\n');
    
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ USER 1 (Tú)                                         │');
    console.log('├─────────────────────────────────────────────────────┤');
    console.log(`│ Email:    ${user1.email.padEnd(42)} │`);
    console.log(`│ Password: ${user1.password.padEnd(42)} │`);
    console.log('└─────────────────────────────────────────────────────┘\n');
    
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ USER 2 (Tu mujer)                                   │');
    console.log('├─────────────────────────────────────────────────────┤');
    console.log(`│ Email:    ${user2.email.padEnd(42)} │`);
    console.log(`│ Password: ${user2.password.padEnd(42)} │`);
    console.log('└─────────────────────────────────────────────────────┘\n');
    
    console.log('🌐 Frontend: http://localhost:5173');
    console.log('🔌 Backend:  http://localhost:3001');
    console.log('📊 Health:   http://localhost:3001/api/health\n');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 NEXT STEPS:');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('1. Login en http://localhost:5173 con las credenciales arriba');
    console.log('2. Ir a Settings → Wearables');
    console.log('3. Conectar vuestros wearables reales (Garmin/Apple Health)');
    console.log('4. Configurar Terra webhook para datos en tiempo real');
    console.log('5. ¡Disfrutar de la aplicación!\n');
    
    // Close database connection
    await db.disconnect();
    console.log('✅ Database connection closed\n');
    
  } catch (error: any) {
    console.error('❌ Error creating users:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
createRealUsers();
