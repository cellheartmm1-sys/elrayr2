const { Client } = require('pg');

const connectionString = 'postgresql://postgres.gnfsmtammkivxlecvefp:H%40mzafarida123@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

async function fixUserSchema() {
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Add username column if not exists
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
    `);
    console.log('✅ Added username column to users table');

    // 2. Drop existing users_role_check constraint and re-add with 'secondary'
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin','secondary','manager','engineer','supervisor','store_keeper','hr','accountant'));
    `);
    console.log('✅ Updated users_role_check constraint to include secondary role');

    // 3. Update existing sample users with usernames if empty
    await client.query(`
      UPDATE users SET username = 'admin' WHERE email = 'admin@alrayeq.com' AND (username IS NULL OR username = '');
      UPDATE users SET username = 'supervisor1' WHERE email = 'supervisor1@alrayeq.com' AND (username IS NULL OR username = '');
      UPDATE users SET username = 'manager' WHERE email = 'manager@alrayeq.com' AND (username IS NULL OR username = '');
      UPDATE users SET username = 'engineer1' WHERE email = 'engineer1@alrayeq.com' AND (username IS NULL OR username = '');
      UPDATE users SET username = 'store1' WHERE email = 'store1@alrayeq.com' AND (username IS NULL OR username = '');
      UPDATE users SET username = 'hr' WHERE email = 'hr@alrayeq.com' AND (username IS NULL OR username = '');
      UPDATE users SET username = 'accountant' WHERE email = 'accountant@alrayeq.com' AND (username IS NULL OR username = '');
    `);
    console.log('✅ Updated sample usernames');

  } catch (err) {
    console.error('❌ Schema Fix Error:', err.message);
  } finally {
    await client.end();
  }
}

fixUserSchema();
