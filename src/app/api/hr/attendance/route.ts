import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('project_id') ?? '';
    const employeeId = searchParams.get('employee_id') ?? '';
    const dateFrom = searchParams.get('date_from') ?? '';
    const dateTo = searchParams.get('date_to') ?? '';
    const status = searchParams.get('status') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (projectId) {
      conditions.push(`a.project_id = $${paramIndex}`);
      params.push(projectId);
      paramIndex++;
    }

    if (employeeId) {
      conditions.push(`a.employee_id = $${paramIndex}`);
      params.push(employeeId);
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`a.attendance_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`a.attendance_date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    if (status) {
      conditions.push(`a.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM attendance a ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          a.id,
          a.employee_id,
          e.employee_number,
          e.full_name AS employee_name,
          e.job_title,
          a.project_id,
          p.name AS project_name,
          a.attendance_date,
          a.check_in,
          a.check_out,
          a.hours_worked,
          a.status,
          a.notes,
          a.created_at
        FROM attendance a
        JOIN employees e ON e.id = a.employee_id
        LEFT JOIN projects p ON p.id = a.project_id
        ${where}
        ORDER BY a.attendance_date DESC, e.full_name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/hr/attendance]', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      project_id,
      attendance_date,
      check_in,
      check_out,
      hours_worked,
      status = 'present',
      notes,
    } = body;

    if (!employee_id || !attendance_date) {
      return NextResponse.json(
        { error: 'employee_id and attendance_date are required' },
        { status: 400 }
      );
    }

    // Prevent duplicate
    const existing = await query(
      'SELECT id FROM attendance WHERE employee_id = $1 AND attendance_date = $2 AND (project_id = $3 OR ($3::uuid IS NULL AND project_id IS NULL))',
      [employee_id, attendance_date, project_id ?? null]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Attendance record already exists for this employee on this date/project' },
        { status: 409 }
      );
    }

    const result = await query(
      `INSERT INTO attendance (employee_id, project_id, attendance_date, check_in, check_out, hours_worked, status, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
      [
        employee_id,
        project_id ?? null,
        attendance_date,
        check_in ?? null,
        check_out ?? null,
        hours_worked ?? null,
        status,
        notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/hr/attendance]', error);
    return NextResponse.json(
      { error: 'Failed to record attendance' },
      { status: 500 }
    );
  }
}
