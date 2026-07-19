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
        ADD COLUMN IF NOT EXISTS project_id UUID;
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
          a.attendance_date,
          a.attendance_type,
          a.attendance_type AS status,
          a.check_in_time,
          a.check_in_time AS check_in,
          a.check_out_time,
          a.check_out_time AS check_out,
          a.hours_worked,
          a.overtime_hours,
          a.notes,
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

    if (!employee_id || !attendance_date) {
      return NextResponse.json({ error: 'بيانات الموظف وتاريخ اليومية مطلوبة' }, { status: 400 });
    }

    const resolvedType = attendance_type ?? status ?? 'present';

    // Prevent duplicate recording for same employee on same date and project
    let existing;
    if (project_id) {
      existing = await query(
        `SELECT id FROM attendance_records WHERE employee_id = $1 AND attendance_date = $2 AND project_id = $3`,
        [employee_id, attendance_date, project_id]
      );
    } else {
      existing = await query(
        `SELECT id FROM attendance_records WHERE employee_id = $1 AND attendance_date = $2 AND project_id IS NULL`,
        [employee_id, attendance_date]
      );
    }

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'تم تسجيل حضور هذا العامل لهذا اليوم مسبقاً' }, { status: 400 });
    }

    let rawCheckIn = check_in_time ?? check_in ?? null;
    let rawCheckOut = check_out_time ?? check_out ?? null;
    let resolvedCheckIn: string | null = null;
    let resolvedCheckOut: string | null = null;

    if (rawCheckIn && typeof rawCheckIn === 'string') {
      if (rawCheckIn.includes('T')) {
        const timePart = rawCheckIn.split('T')[1]?.replace('Z', '') || '08:00:00';
        resolvedCheckIn = `${attendance_date} ${timePart}`;
      } else if (!rawCheckIn.includes(' ')) {
        resolvedCheckIn = `${attendance_date} ${rawCheckIn}`;
      } else {
        resolvedCheckIn = rawCheckIn;
      }
    } else if (resolvedType === 'present') {
      resolvedCheckIn = `${attendance_date} 08:00:00`;
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
    } else if (resolvedType === 'present') {
      resolvedCheckOut = `${attendance_date} 17:00:00`;
    }

    const result = await query(
      `INSERT INTO attendance_records (employee_id, project_id, attendance_date, attendance_type, check_in_time, check_out_time, hours_worked, overtime_hours, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *`,
      [
        employee_id,
        project_id ?? null,
        attendance_date,
        resolvedType,
        resolvedCheckIn,
        resolvedCheckOut,
        hours_worked ? Number(hours_worked) : null,
        overtime_hours ? Number(overtime_hours) : 0,
        notes ?? null,
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

    await query('DELETE FROM attendance_records WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Attendance deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/hr/attendance]', error);
    return NextResponse.json({ error: error?.message || 'فشل حذف اليومية' }, { status: 500 });
  }
}
