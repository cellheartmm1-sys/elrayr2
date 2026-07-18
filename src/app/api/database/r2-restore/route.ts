import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { getR2Config, getBackupFromR2 } from '@/lib/r2';

const TABLE_ORDER = [
  'companies', 'departments', 'items_catalog', 'users', 'warehouses', 'subcontractors',
  'projects', 'employees', 'employee_loans', 'company_debts', 'project_phases',
  'project_progress', 'estimations', 'boq_items', 'material_requests',
  'material_request_items', 'material_submittals', 'inventory_items',
  'inventory_transactions', 'subcontractor_contracts', 'subcontractor_ipc',
  'subcontractor_ipc_items', 'daily_labor', 'labor_attendance', 'client_ipc',
  'client_ipc_items', 'project_expenses', 'maintenance_contracts',
  'maintenance_visits', 'fault_tickets', 'salary_allocations',
  'attendance_records', 'payroll', 'overtime_requests', 'personal_assets',
  'employee_documents', 'equipment_documents', 'notifications'
];

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json({ error: 'اسم الملف (Key) مطلوب لاستعادة البيانات.' }, { status: 400 });
    }

    const config = await getR2Config();
    if (!config) {
      return NextResponse.json({ error: 'لم يتم إعداد بيانات الاتصال بـ Cloudflare R2.' }, { status: 400 });
    }

    // 1. Fetch backup file content from R2
    const backupContentStr = await getBackupFromR2(key, config);
    const backupJson = JSON.parse(backupContentStr);

    if (!backupJson || !backupJson.data) {
      return NextResponse.json({ error: 'ملف النسخة الاحتياطية المسترجع غير صالح أو فارغ.' }, { status: 400 });
    }

    const backup = backupJson.data;

    // 2. Start transaction
    await client.query('BEGIN');

    // 3. Truncate all tables in database cascade to reset everything cleanly
    const existingTablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('spatial_ref_sys')
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
    `);
    
    const tablesToTruncate = existingTablesRes.rows.map(r => `"${r.table_name}"`);
    if (tablesToTruncate.length > 0) {
      await client.query(`TRUNCATE TABLE ${tablesToTruncate.join(', ')} RESTART IDENTITY CASCADE;`);
    }

    // 4. Restore tables in dependency order
    for (const name of TABLE_ORDER) {
      const rows = backup[name];
      if (Array.isArray(rows) && rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const columnsCsv = columns.map(c => `"${c}"`).join(', ');

        for (const row of rows) {
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const values = columns.map(c => row[c]);

          await client.query(`
            INSERT INTO "${name}" (${columnsCsv}) 
            VALUES (${placeholders})
          `, values);
        }
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'تم استعادة النسخة الاحتياطية من السحابة بنجاح!' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Database restore from R2 error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
