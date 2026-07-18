import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 3, // Reduced from 10 to prevent connection exhaustion in serverless environments
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased to 10s to handle cold starts or pooler latency
});

let schedulerInitCalled = false;

export async function query(sql: string, params?: unknown[]) {
  if (!schedulerInitCalled) {
    schedulerInitCalled = true;
    import('./r2')
      .then(m => m.initBackupScheduler())
      .catch(err => console.error('Failed to init backup scheduler:', err));
  }

  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

export default pool;
