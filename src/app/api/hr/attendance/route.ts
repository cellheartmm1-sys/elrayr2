import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

// Actual table: attendance_records (NOT 'attendance')
// Columns: employee_id, project_id, attendance_date, attendance_type,
//          check_in_time, check_out_time, hours_worked, overtime_hours, notes, created_at

async function ensureAttendanceSchema() {
  try {
    await query(`
      ALTER TABLE attendance_records 
        ADD COLUMN IF NOT EXISTS hours_worked NUMERIC DEFAULT 8,
        ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS check_in_time VARCHAR(50),
        ADD COLUMN IF NOT EXISTS check_out_time VARCHAR(50),
        ADD COLUMN IF NOT EXISTS attendance_type VARCHAR(50) DEFAULT 'present',
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS project_id UUID,
        ADD COLUMN IF NOT EXISTS reference_expense_id UUID;
    `);
  } catch (err) {
    console.error('Failed to auto-alter attendance_records schema:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureAttendanceSchema();
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('project_id') ?? '';
    const employeeId = searchParams.get('employee_id') ?? '';
    const dateFrom = searchParams.get('date_from') ?? '';
    const dateTo = searchParams.get('date_to') ?? '';
    const attendanceType = searchParams.get('status') ?? searchParams.get('attendance_type') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (projectId) { conditions.push(`a.project_id = $${paramIndex}`); params.push(projectId); paramIndex++; }
    if (employeeId) { conditions.push(`a.employee_id = $${paramIndex}`); params.push(employeeId); paramIndex++; }
    if (dateFrom) { conditions.push(`a.attendance_date >= $${paramIndex}`); params.push(dateFrom); paramIndex++; }
    if (dateTo) { conditions.push(`a.attendance_date <= $${paramIndex}`); params.push(dateTo); paramIndex++; }
    if (attendanceType) { conditions.push(`a.attendance_type = $${paramIndex}`); params.push(attendanceType); paramIndex++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM attendance_records a ${where}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          a.id,
          a.employee_id,
          e.employee_number,
          e.full_name AS employee_name,
          e.job_title,
          e.base_salary,
          a.project_id,
          p.name AS project_name,
          TO_CHAR(a.attendance_date::date, 'YYYY-MM-DD') AS attendance_date,
          a.attendance_type,
          a.attendance_type AS status,
          a.check_in_time,
          a.check_in_time AS check_in,
          a.check_out_time,
          a.check_out_time AS check_out,
          a.hours_worked,
          a.overtime_hours,
          a.notes,
          a.reference_expense_id,
          a.created_at
        FROM attendance_records a
        JOIN employees e ON e.id = a.employee_id
        LEFT JOIN projects p ON p.id = a.project_id
        ${where}
        ORDER BY a.attendance_date DESC, e.full_name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/hr/attendance]', error);
    return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAttendanceSchema();
    const body = await request.json();
    const {
      employee_id,
      project_id,
      attendance_date,
      check_in_time,
      check_in,         // legacy alias
      check_out_time,
      check_out,        // legacy alias
      hours_worked,
      overtime_hours,
      attendance_type,
      status,           // legacy alias → attendance_type
      notes,
    } = body;

    const resolvedType = attendance_type ?? status ?? 'present';

    if (!employee_id || !attendance_date) {
      return NextResponse.json({ error: 'بيانات العامل وتاريخ اليومية مطلوبة' }, { status: 400 });
    }

    if ((resolvedType === 'present' || resolvedType === 'late' || resolvedType === 'half_day') && !project_id) {
      // For attendance linked to project expenses, check if projects exist
      const prjCheck = await query('SELECT id FROM projects LIMIT 1');
      if (prjCheck.rows.length > 0 && !project_id) {
        return NextResponse.json({ error: 'إجبارياً: يجب اختيار المشروع/الموقع المرتبط بالحضور' }, { status: 400 });
      }
    }

    // Replace existing attendance record for same employee on same date to allow updates
    const existing = await query(
      `SELECT id, reference_expense_id FROM attendance_records WHERE employee_id = $1 AND attendance_date = $2`,
      [employee_id, attendance_date]
    );

    if (existing.rows.length > 0) {
      for (const rec of existing.rows) {
        if (rec.reference_expense_id) {
          try {
            await query('DELETE FROM project_expenses WHERE id = $1', [rec.reference_expense_id]);
          } catch (err) {}
        }
        await query('DELETE FROM attendance_records WHERE id = $1', [rec.id]);
      }
    }

    // Fetch employee details to calculate Direct Labor Cost
    const empRes = await query('SELECT full_name, base_salary FROM employees WHERE id = $1', [employee_id]);
    const empName = empRes.rows[0]?.full_name || 'عامل موقع';
    const baseDailyRate = Number(empRes.rows[0]?.base_salary || 150);

    const totalWorkedHours = hours_worked ? Number(hours_worked) : 10;
    let otHours = overtime_hours ? Number(overtime_hours) : 0;

    // For rest_day attendance, calculate overtime for hours beyond 10 hours automatically if not explicitly given
    if (resolvedType === 'rest_day' && totalWorkedHours > 10 && otHours === 0) {
      otHours = totalWorkedHours - 10;
    }

    const otRate = 25; // Hourly overtime rate

    let calculatedLaborCost = 0;
    if (resolvedType === 'present' || resolvedType === 'late' || resolvedType === 'rest_day') {
      calculatedLaborCost = baseDailyRate + (otHours * otRate);
    } else if (resolvedType === 'half_day') {
      calculatedLaborCost = (baseDailyRate / 2) + (otHours * otRate);
    }

    // Note: Daily labor is tracked via attendance_records (not duplicated in project_expenses)
    let refExpenseId: string | null = null;

    let rawCheckIn = check_in_time ?? check_in ?? null;
    let rawCheckOut = check_out_time ?? check_out ?? null;
    let resolvedCheckIn: string | null = null;
    let resolvedCheckOut: string | null = null;

    if (rawCheckIn && typeof rawCheckIn === 'string') {
      if (rawCheckIn.includes('T')) {
        const timePart = rawCheckIn.split('T')[1]?.replace('Z', '') || '07:00:00';
        resolvedCheckIn = `${attendance_date} ${timePart}`;
      } else if (!rawCheckIn.includes(' ')) {
        resolvedCheckIn = `${attendance_date} ${rawCheckIn}`;
      } else {
        resolvedCheckIn = rawCheckIn;
      }
    } else if (resolvedType === 'present' || resolvedType === 'late') {
      resolvedCheckIn = `${attendance_date} 07:00:00`;
    }

    if (rawCheckOut && typeof rawCheckOut === 'string') {
      if (rawCheckOut.includes('T')) {
        const timePart = rawCheckOut.split('T')[1]?.replace('Z', '') || '17:00:00';
        resolvedCheckOut = `${attendance_date} ${timePart}`;
      } else if (!rawCheckOut.includes(' ')) {
        resolvedCheckOut = `${attendance_date} ${rawCheckOut}`;
      } else {
        resolvedCheckOut = rawCheckOut;
      }
    } else if (resolvedType === 'present' || resolvedType === 'late') {
      resolvedCheckOut = `${attendance_date} 17:00:00`;
    }

    const result = await query(
      `INSERT INTO attendance_records (employee_id, project_id, attendance_date, attendance_type, check_in_time, check_out_time, hours_worked, overtime_hours, notes, reference_expense_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *`,
      [
        employee_id,
        project_id || null,
        attendance_date,
        resolvedType,
        resolvedCheckIn,
        resolvedCheckOut,
        hours_worked ? Number(hours_worked) : 10,
        otHours,
        notes ?? null,
        refExpenseId
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/hr/attendance]', error);
    return NextResponse.json({ error: error?.message || 'فشل تسجيل حضور اليومية' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // Fetch linked reference_expense_id to auto-clean project expense
    const record = await query('SELECT reference_expense_id FROM attendance_records WHERE id = $1', [id]);
    if (record.rows.length > 0 && record.rows[0].reference_expense_id) {
      await query('DELETE FROM project_expenses WHERE id = $1', [record.rows[0].reference_expense_id]);
    }

    await query('DELETE FROM attendance_records WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'تم حذف تسجيل الحضور وإلغاء القيد المالي المباشر بنجاح' });
  } catch (error: any) {
    console.error('[DELETE /api/hr/attendance]', error);
    return NextResponse.json({ error: error?.message || 'فشل حذف تسجيل الحضور' }, { status: 500 });
  }
}
