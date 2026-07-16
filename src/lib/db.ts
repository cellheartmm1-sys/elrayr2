import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.gnfsmtammkivxlecvefp:H%40mzafarida123@aws-0-eu-north-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 3, // Reduced from 10 to prevent connection exhaustion in serverless environments
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased to 10s to handle cold starts or pooler latency
});

export async function query(sql: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

export default pool;
