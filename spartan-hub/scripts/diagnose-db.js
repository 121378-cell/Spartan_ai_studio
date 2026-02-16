const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../backend/data/spartan.db');

console.log(`Checking database at: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
    console.error('Database file not found!');
    process.exit(1);
}

// Check permissions
try {
    fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
    console.log('Read/Write permissions: OK');
} catch (err) {
    console.error('Permission error:', err.message);
}

try {
    const db = new Database(dbPath, { readonly: true });
    
    // Integrity Check
    const integrity = db.pragma('integrity_check');
    console.log('Integrity Check:', integrity);

    // Table Info
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name));

    if (tables.some(t => t.name === 'users')) {
        const columns = db.pragma('table_info(users)');
        console.log('Users Table Schema:', columns);
        
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
        console.log('User Count:', userCount.count);
        
        // Check for potential duplicates if email is unique
        try {
            const duplicates = db.prepare('SELECT email, COUNT(*) as count FROM users GROUP BY email HAVING count > 1').all();
            if (duplicates.length > 0) {
                console.log('Duplicate Emails Found:', duplicates);
            } else {
                console.log('No duplicate emails found.');
            }
        } catch (e) {
            console.log('Could not check duplicates (maybe email column missing):', e.message);
        }
    } else {
        console.error('Table "users" not found!');
    }

    db.close();
} catch (err) {
    console.error('Database Error:', err);
}
