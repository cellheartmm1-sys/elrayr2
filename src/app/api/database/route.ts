import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Predefined table insertion order to satisfy foreign key constraints during restore
const TABLE_ORDER = [
  'companies',
  'departments',
  'items_catalog',
  'users',
  'warehouses',
  'subcontractors',
  'projects',
  'employees',
  'project_phases',
  'project_progress',
  'estimations',
  'boq_items',
  'material_requests',
  'material_request_items',
  'material_submittals',
  'inventory_items',
  'inventory_transactions',
  'subcontractor_contracts',
  'subcontractor_ipc',
  'subcontractor_ipc_items',
  'daily_labor',
  'labor_attendance',
  'client_ipc',
  'client_ipc_items',
  'project_expenses',
  'maintenance_contracts',
  'maintenance_visits',
  'fault_tickets',
  'salary_allocations',
  'attendance_records',
  'payroll',
  'overtime_requests',
  'personal_assets',
  'employee_documents',
  'equipment_documents',
  'notifications'
];

// Human-readable labels in Arabic for the tables
const TABLE_LABELS: Record<string, string> = {
  companies: 'ملف الشركة',
  departments: 'الأقسام الإدارية',
  items_catalog: 'دليل المواد والأعمال',
  users: 'المستخدمون والصلاحيات',
  warehouses: 'المستودعات والمخازن',
  subcontractors: 'مقاولون الباطن',
  projects: 'المشاريع',
  employees: 'الموظفون',
  project_phases: 'مراحل عمل المشاريع',
  project_progress: 'نسب إنجاز المشاريع',
  estimations: 'التسعير والمقايسات',
  boq_items: 'بنود جدول الكميات BOQ',
  material_requests: 'طلبات المواد',
  material_request_items: 'بنود طلبات المواد',
  material_submittals: 'اعتمادات المواد',
  inventory_items: 'أصناف المخزون',
  inventory_transactions: 'حركات المستودعات',
  subcontractor_contracts: 'عقود مقاولي الباطن',
  subcontractor_ipc: 'مستخلصات مقاولي الباطن',
  subcontractor_ipc_items: 'بنود مستخلصات الباطن',
  daily_labor: 'سجلات العمالة اليومية',
  labor_attendance: 'حضور العمالة اليومية',
  client_ipc: 'مستخلصات المالك',
  client_ipc_items: 'بنود مستخلصات المالك',
  project_expenses: 'المصروفات النثرية للمشاريع',
  maintenance_contracts: 'عقود الصيانة التشغيلية',
  maintenance_visits: 'زيارات الصيانة الدورية',
  fault_tickets: 'بلاغات الأعطال',
  salary_allocations: 'توزيع رواتب الموظفين',
  attendance_records: 'حضور وانصراف الموظفين',
  payroll: 'مسيرات الرواتب الشهرية',
  overtime_requests: 'طلبات العمل الإضافي',
  personal_assets: 'العهد العينية للموظفين',
  employee_documents: 'وثائق ومستندات الموظفين',
  equipment_documents: 'وثائق المعدات والسيارات',
  notifications: 'التنبيهات والإشعارات'
};

export async function GET() {
  try {
    // 1. Fetch all user tables in public schema
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('spatial_ref_sys')
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
      ORDER BY table_name;
    `);

    const tableNames = tablesRes.rows.map(r => r.table_name);

    // 2. Fetch row counts for each table
    const tablesInfo = [];
    for (const name of tableNames) {
      const countRes = await pool.query(`SELECT COUNT(*) as count FROM "${name}"`);
      const rowCount = parseInt(countRes.rows[0].count, 10);
      tablesInfo.push({
        name,
        label: TABLE_LABELS[name] || name,
        rowCount
      });
    }

    // Sort by labels or order index
    tablesInfo.sort((a, b) => {
      const idxA = TABLE_ORDER.indexOf(a.name);
      const idxB = TABLE_ORDER.indexOf(b.name);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    return NextResponse.json({ tables: tablesInfo });
  } catch (error: any) {
    console.error('Error fetching tables info:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { action, tableName, backupData } = await request.json();

    // ----------------------------------------------------
    // ACTION: BACKUP
    // ----------------------------------------------------
    if (action === 'backup') {
      const backup: Record<string, any[]> = {};
      
      // Fetch all rows from all tables in order
      for (const name of TABLE_ORDER) {
        // Double check if table exists before fetching
        const checkRes = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          );
        `, [name]);

        if (checkRes.rows[0].exists) {
          const rowsRes = await client.query(`SELECT * FROM "${name}"`);
          backup[name] = rowsRes.rows;
        }
      }

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: backup
      });
    }

    // ----------------------------------------------------
    // ACTION: RESTORE
    // ----------------------------------------------------
    if (action === 'restore') {
      if (!backupData || !backupData.data) {
        return NextResponse.json({ error: 'ملف النسخة الاحتياطية غير صالح أو فارغ.' }, { status: 400 });
      }

      const backup = backupData.data;

      // Start transaction
      await client.query('BEGIN');

      // 1. Truncate all tables in database cascade to reset everything cleanly
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

      // 2. Restore tables in dependency order
      for (const name of TABLE_ORDER) {
        const rows = backup[name];
        if (Array.isArray(rows) && rows.length > 0) {
          const columns = Object.keys(rows[0]);
          const columnsCsv = columns.map(c => `"${c}"`).join(', ');

          for (const row of rows) {
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            const values = columns.map(c => {
              const val = row[c];
              // Keep Date objects or parse strings where necessary, pg library handles standard strings/objects
              return val;
            });

            await client.query(`
              INSERT INTO "${name}" (${columnsCsv}) 
              VALUES (${placeholders})
            `, values);
          }
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: 'تم استعادة النسخة الاحتياطية بنجاح!' });
    }

    // ----------------------------------------------------
    // ACTION: RESET ALL
    // ----------------------------------------------------
    if (action === 'reset-all') {
      await client.query('BEGIN');
      
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

      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: 'تم تصفير جميع جداول قاعدة البيانات بنجاح!' });
    }

    // ----------------------------------------------------
    // ACTION: RESET SINGLE TABLE
    // ----------------------------------------------------
    if (action === 'reset-table') {
      if (!tableName) {
        return NextResponse.json({ error: 'اسم الجدول مطلوب لتصفييره.' }, { status: 400 });
      }

      // Verify table exists
      const checkRes = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        );
      `, [tableName]);

      if (!checkRes.rows[0].exists) {
        return NextResponse.json({ error: `الجدول ${tableName} غير موجود.` }, { status: 404 });
      }

      // Truncate table cascade to handle foreign keys
      await client.query(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
      return NextResponse.json({ success: true, message: `تم تصفير بيانات جدول "${TABLE_LABELS[tableName] || tableName}" بنجاح!` });
    }

    return NextResponse.json({ error: 'العملية المطلوبة غير صالحة.' }, { status: 400 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Database action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
