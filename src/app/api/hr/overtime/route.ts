import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? '';
    const employeeId = searchParams.get('employee_id') ?? '';
    const projectId = searchParams.get('project_id') ?? '';
    const dateFrom = searchParams.get('date_from') ?? '';
    const dateTo = searchParams.get('date_to') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`o.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (employeeId) {
      conditions.push(`o.employee_id = $${paramIndex}`);
      params.push(employeeId);
      paramIndex++;
    }

    if (projectId) {
      conditions.push(`o.project_id = $${paramIndex}`);
      params.push(projectId);
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`o.overtime_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`o.overtime_date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM overtime o ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          o.id,
          o.employee_id,
          e.employee_number,
          e.full_name AS employee_name,
          e.job_title,
          o.project_id,
          p.name AS project_name,
          o.overtime_date,
          o.hours,
          o.rate,
          o.amount,
          o.reason,
          o.status,
          o.approved_by,
          approver.full_name AS approver_name,
          o.approval_date,
          o.notes,
          o.created_at,
          o.updated_at
        FROM overtime o
        JOIN employees e ON e.id = o.employee_id
        LEFT JOIN projects p ON p.id = o.project_id
        LEFT JOIN employees approver ON approver.id = o.approved_by
        ${where}
        ORDER BY o.overtime_date DESC
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
    console.error('[GET /api/hr/overtime]', error);
    return NextResponse.json(
      { error: 'Failed to fetch overtime records' },
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
      overtime_date,
      hours,
      rate,
      amount,
      reason,
      notes,
    } = body;

    if (!employee_id || !overtime_date || !hours) {
      return NextResponse.json(
        { error: 'employee_id, overtime_date, and hours are required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO overtime (employee_id, project_id, overtime_date, hours, rate, amount, reason, notes, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
        RETURNING *`,
      [
        employee_id,
        project_id ?? null,
        overtime_date,
        hours,
        rate ?? null,
        amount ?? null,
        reason ?? null,
        notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/hr/overtime]', error);
    return NextResponse.json(
      { error: 'Failed to submit overtime request' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, approved_by, approval_date, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'id and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE overtime
        SET status = $1, approved_by = $2, approval_date = $3, notes = COALESCE($4, notes), updated_at = NOW()
        WHERE id = $5
        RETURNING *`,
      [status, approved_by ?? null, approval_date ?? null, notes ?? null, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Overtime record not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[PUT /api/hr/overtime]', error);
    return NextResponse.json(
      { error: 'Failed to update overtime record' },
      { status: 500 }
    );
  }
}
