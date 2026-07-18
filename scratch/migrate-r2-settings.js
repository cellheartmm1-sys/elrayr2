const { Client } = require('pg');
const fs = require('fs');

async function run() {
  let databaseUrl = null;
  try {
    if (fs.existsSync('.env.local')) {
      const env = fs.readFileSync('.env.local', 'utf8');
      const lines = env.split('\n');
      for (const line of lines) {
        if (line.startsWith('DATABASE_URL=')) {
          databaseUrl = line.split('DATABASE_URL=')[1].trim();
        }
      }
    }
  } catch (err) {
    console.error('Error reading .env.local file:', err);
  }

  if (!databaseUrl) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database successfully.');

    const sql = `
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS r2_account_id TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS r2_endpoint TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS r2_bucket_name TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS r2_access_key_id TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS r2_secret_access_key TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS r2_backup_interval_hours INTEGER DEFAULT 8;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS r2_last_backup_at TIMESTAMPTZ;
    `;

    await client.query(sql);
    console.log('Migration completed successfully: columns added to companies table.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
