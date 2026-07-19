const { Client } = require('pg');

const connectionString = 'postgresql://postgres.gnfsmtammkivxlecvefp:H%40mzafarida123@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

async function addPasswordColumn() {
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Add password column if not exists
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '123456';
    `);
    console.log('✅ Added password column to users table');

    // Update existing users password if null
    await client.query(`
      UPDATE users SET password = 'admin' WHERE (email = 'admin@alrayeq.com' OR username = 'admin') AND (password IS NULL OR password = '123456');
    `);
    console.log('✅ Set default passwords for sample users');

  } catch (err) {
    console.error('❌ Migration Error:', err.message);
  } finally {
    await client.end();
  }
}

addPasswordColumn();
