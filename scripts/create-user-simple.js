/**
 * Spartan Hub 2.0 - Quick User Creator
 * Creates a user directly in the database
 * 
 * Usage: node scripts/create-user-simple.js <email> <name> <password>
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function createUser() {
  const email = process.argv[2] || 'user@local.test';
  const name = process.argv[3] || 'Test User';
  const password = process.argv[4] || 'Password123!';

  console.log('\n🚀 Spartan Hub 2.0 - Creating User...\n');
  console.log(`   Email: ${email}`);
  console.log(`   Name: ${name}`);
  console.log(`   Password: ${password}\n`);

  // Database connection config
  const client = new Client({
    host: 'localhost',
    port: 5434,  // Docker PostgreSQL port
    database: 'spartan_hub',
    user: 'spartan_user',
    password: 'spartan_password',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const query = `
      INSERT INTO users (email, name, password, role, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, email, name, role;
    `;
    
    const values = [email, name, hashedPassword, 'USER'];
    const result = await client.query(query, values);

    console.log('✅ USER CREATED SUCCESSFULLY!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🌐 Login at: http://localhost:4173\n');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === '23505') {
      console.log('\n⚠️  User already exists with this email\n');
    }
    
    await client.end();
    process.exit(1);
  }
}

createUser();
