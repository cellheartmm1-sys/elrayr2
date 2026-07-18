import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const departmentId = searchParams.get('department_id') ?? '';
    const employmentType = searchParams.get('employment_type') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(
        `(e.full_name ILIKE $${paramIndex} OR e.employee_number ILIKE $${paramIndex} OR e.phone ILIKE $${paramIndex} OR e.job_title ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`e.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (departmentId) {
      conditions.push(`e.department_id = $${paramIndex}`);
      params.push(departmentId);
      paramIndex++;
    }

    if (employmentType) {
      conditions.push(`e.employment_type = $${paramIndex}`);
      params.push(employmentType);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM employees e ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          e.id,
          e.employee_number,
          e.full_name,
          e.nationality,
          e.job_title,
          e.department_id,
          d.name AS department_name,
          e.base_salary,
          e.housing_allowance,
          e.transport_allowance,
          e.other_allowances,
          (e.base_salary + COALESCE(e.housing_allowance, 0) + COALESCE(e.transport_allowance, 0) + COALESCE(e.other_allowances, 0)) AS total_salary,
          e.phone,
          e.status,
          e.employment_type,
          e.iqama_expiry,
          e.created_at,
          e.updated_at
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        ${where}
        ORDER BY e.full_name ASC
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
    console.error('[GET /api/employees]', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_number,
      full_name,
      full_name_en,
      nationality,
      id_number,
      iqama_number,
      iqama_expiry,
      passport_number,
      passport_expiry,
      hire_date,
      job_title,
      department_id,
      base_salary,
      housing_allowance,
      transport_allowance,
      other_allowances,
      bank_account,
      bank_name,
      iban,
      phone,
      email,
      status = 'active',
      employment_type,
      notes,
    } = body;

    if (!full_name || !employee_number) {
      return NextResponse.json(
        { error: 'employee_number and full_name are required' },
        { status: 400 }
      );
    }

    // Check duplicate employee_number
    const existing = await query(
      'SELECT id FROM employees WHERE employee_number = $1',
      [employee_number]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Employee number already exists' },
        { status: 409 }
      );
    }

    const result = await query(
      `INSERT INTO employees (
          employee_number, full_name, full_name_en, nationality,
          id_number, iqama_number, iqama_expiry, passport_number, passport_expiry,
          hire_date, job_title, department_id,
          base_salary, housing_allowance, transport_allowance, other_allowances,
          bank_account, bank_name, iban, phone, email,
          status, employment_type, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
        RETURNING *`,
      [
        employee_number, full_name, full_name_en ?? null, nationality ?? null,
        id_number ?? null, iqama_number ?? null, iqama_expiry ?? null,
        passport_number ?? null, passport_expiry ?? null,
        hire_date ?? null, job_title ?? null, department_id ?? null,
        base_salary ?? 0, housing_allowance ?? 0, transport_allowance ?? 0, other_allowances ?? 0,
        bank_account ?? null, bank_name ?? null, iban ?? null, phone ?? null, email ?? null,
        status, employment_type ?? null, notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/employees]', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
