import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.gnfsmtammkivxlecvefp:H%40mzafarida123@aws-0-eu-north-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function fixFK() {
  try {
    // Fix material_requests FK constraints
    await pool.query(`
      ALTER TABLE material_requests
        DROP CONSTRAINT IF EXISTS material_requests_requested_by_fkey,
        DROP CONSTRAINT IF EXISTS material_requests_approved_by_fkey,
        DROP CONSTRAINT IF EXISTS material_requests_warehouse_id_fkey
    `);
    console.log('✅ Fixed material_requests FK constraints');

    // Fix material_submittals FK constraints
    await pool.query(`
      ALTER TABLE material_submittals
        DROP CONSTRAINT IF EXISTS material_submittals_submitted_by_fkey
    `);
    console.log('✅ Fixed material_submittals FK constraints');

    console.log('🎉 All FK constraints fixed!');
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e);
    await pool.end();
    process.exit(1);
  }
}

fixFK();
