import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Drop FK constraints that block inserting employee IDs
    await query(`
      ALTER TABLE material_requests
        DROP CONSTRAINT IF EXISTS material_requests_requested_by_fkey,
        DROP CONSTRAINT IF EXISTS material_requests_approved_by_fkey,
        DROP CONSTRAINT IF EXISTS material_requests_warehouse_id_fkey
    `);

    // Also fix project_id to not be NOT NULL if needed
    await query(`
      ALTER TABLE material_requests
        ALTER COLUMN requested_by DROP NOT NULL
    `).catch(() => null); // ignore if already nullable

    return NextResponse.json({ success: true, message: 'FK constraints dropped successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
