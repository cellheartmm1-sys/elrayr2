import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Run schema migration to ensure project_id column exists
    await query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
    `);

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
          e.project_id,
          p.name AS project_name,
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
        LEFT JOIN projects p ON p.id = e.project_id
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
    // Run schema migration to ensure project_id column exists
    await query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
    `);

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
      project_id,
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

    const sanitizeEmpty = (val: any, fallback: any = null) => {
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
        return fallback;
      }
      return val;
    };

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
          hire_date, job_title, department_id, project_id,
          base_salary, housing_allowance, transport_allowance, other_allowances,
          bank_account, bank_name, iban, phone, email,
          status, employment_type, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
        RETURNING *`,
      [
        employee_number, 
        full_name, 
        sanitizeEmpty(full_name_en), 
        sanitizeEmpty(nationality),
        sanitizeEmpty(id_number), 
        sanitizeEmpty(iqama_number), 
        sanitizeEmpty(iqama_expiry),
        sanitizeEmpty(passport_number), 
        sanitizeEmpty(passport_expiry),
        sanitizeEmpty(hire_date), 
        sanitizeEmpty(job_title), 
        sanitizeEmpty(department_id), 
        sanitizeEmpty(project_id),
        Number(sanitizeEmpty(base_salary, 0)), 
        Number(sanitizeEmpty(housing_allowance, 0)), 
        Number(sanitizeEmpty(transport_allowance, 0)), 
        Number(sanitizeEmpty(other_allowances, 0)),
        sanitizeEmpty(bank_account), 
        sanitizeEmpty(bank_name), 
        sanitizeEmpty(iban), 
        sanitizeEmpty(phone), 
        sanitizeEmpty(email),
        status, 
        sanitizeEmpty(employment_type), 
        sanitizeEmpty(notes),
      ]
    );

    const newEmployee = result.rows[0];

    // Store uploaded files in employee_documents table
    if (body.uploaded_files && Array.isArray(body.uploaded_files)) {
      for (const file of body.uploaded_files) {
        await query(
          `INSERT INTO employee_documents (
            employee_id, document_type, document_number, file_url, notes
          ) VALUES ($1, $2, $3, $4, $5)`,
          [newEmployee.id, 'other', file.name, file.key, 'ملف مرفق عند إضافة الموظف']
        );
      }
    }

    return NextResponse.json({ data: newEmployee }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    console.error('[POST /api/employees]', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
