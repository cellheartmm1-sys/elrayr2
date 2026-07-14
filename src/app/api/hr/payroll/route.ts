import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const month = searchParams.get('month') ?? '';
    const year = searchParams.get('year') ?? '';
    const status = searchParams.get('status') ?? '';
    const employeeId = searchParams.get('employee_id') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (month) {
      conditions.push(`p.month = $${paramIndex}`);
      params.push(parseInt(month, 10));
      paramIndex++;
    }

    if (year) {
      conditions.push(`p.year = $${paramIndex}`);
      params.push(parseInt(year, 10));
      paramIndex++;
    }

    if (status) {
      conditions.push(`p.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (employeeId) {
      conditions.push(`p.employee_id = $${paramIndex}`);
      params.push(employeeId);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM payroll p ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          p.id,
          p.employee_id,
          e.employee_number,
          e.full_name AS employee_name,
          e.job_title,
          d.name AS department_name,
          p.month,
          p.year,
          p.base_salary,
          p.housing_allowance,
          p.transport_allowance,
          p.other_allowances,
          p.overtime_amount,
          p.deductions,
          p.net_salary,
          p.status,
          p.payment_date,
          p.notes,
          p.created_at,
          p.updated_at
        FROM payroll p
        JOIN employees e ON e.id = p.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        ${where}
        ORDER BY p.year DESC, p.month DESC, e.full_name ASC
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
    console.error('[GET /api/hr/payroll]', error);
    return NextResponse.json(
      { error: 'Failed to fetch payroll records' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      month,
      year,
      base_salary,
      housing_allowance,
      transport_allowance,
      other_allowances,
      overtime_amount = 0,
      deductions = 0,
      status = 'draft',
      payment_date,
      notes,
    } = body;

    if (!employee_id || !month || !year) {
      return NextResponse.json(
        { error: 'employee_id, month, and year are required' },
        { status: 400 }
      );
    }

    // Prevent duplicate payroll entry
    const existing = await query(
      'SELECT id FROM payroll WHERE employee_id = $1 AND month = $2 AND year = $3',
      [employee_id, month, year]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Payroll record already exists for this employee/month/year' },
        { status: 409 }
      );
    }

    // If salary values not provided, pull from employee record
    let salaryData = { base_salary, housing_allowance, transport_allowance, other_allowances };
    if (base_salary === undefined) {
      const emp = await query(
        'SELECT base_salary, housing_allowance, transport_allowance, other_allowances FROM employees WHERE id = $1',
        [employee_id]
      );
      if (emp.rows.length === 0) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
      salaryData = emp.rows[0];
    }

    const grossSalary =
      (salaryData.base_salary ?? 0) +
      (salaryData.housing_allowance ?? 0) +
      (salaryData.transport_allowance ?? 0) +
      (salaryData.other_allowances ?? 0) +
      (overtime_amount ?? 0);
    const netSalary = grossSalary - (deductions ?? 0);

    const result = await query(
      `INSERT INTO payroll (
          employee_id, month, year, base_salary, housing_allowance,
          transport_allowance, other_allowances, overtime_amount,
          deductions, net_salary, status, payment_date, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *`,
      [
        employee_id,
        month,
        year,
        salaryData.base_salary ?? 0,
        salaryData.housing_allowance ?? 0,
        salaryData.transport_allowance ?? 0,
        salaryData.other_allowances ?? 0,
        overtime_amount,
        deductions,
        netSalary,
        status,
        payment_date ?? null,
        notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/hr/payroll]', error);
    return NextResponse.json(
      { error: 'Failed to create payroll record' },
      { status: 500 }
    );
  }
}
