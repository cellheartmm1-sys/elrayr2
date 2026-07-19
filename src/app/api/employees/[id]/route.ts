import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const employeeRes = await query(`
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.id = $1
    `, [id]);

    if (!employeeRes.rows[0]) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const [docs, assets, attendance, allocations] = await Promise.all([
      query(`SELECT * FROM employee_documents WHERE employee_id = $1`, [id]),
      query(`SELECT * FROM personal_assets WHERE assigned_to = $1`, [id]),
      query(`SELECT * FROM attendance_records WHERE employee_id = $1 ORDER BY attendance_date DESC LIMIT 30`, [id]),
      query(`SELECT sa.*, p.name as project_name FROM salary_allocations sa JOIN projects p ON p.id = sa.project_id WHERE sa.employee_id = $1`, [id]),
    ]);

    return NextResponse.json({
      employee: employeeRes.rows[0],
      documents: docs.rows,
      assets: assets.rows,
      attendance: attendance.rows,
      allocations: allocations.rows,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const {
      full_name, full_name_en, nationality, id_number, iqama_number, iqama_expiry,
      passport_number, passport_expiry, date_of_birth, hire_date, job_title,
      department_id, project_id, employment_type, base_salary, housing_allowance, transport_allowance,
      other_allowances, bank_account, bank_name, iban, phone, email, emergency_contact,
      emergency_phone, status, notes
    } = body;

    const result = await query(`
      UPDATE employees SET
        full_name = $1, full_name_en = $2, nationality = $3, id_number = $4, iqama_number = $5, iqama_expiry = $6,
        passport_number = $7, passport_expiry = $8, date_of_birth = $9, hire_date = $10, job_title = $11,
        department_id = $12, project_id = $13, employment_type = $14, base_salary = $15, housing_allowance = $16, transport_allowance = $17,
        other_allowances = $18, bank_account = $19, bank_name = $20, iban = $21, phone = $22, email = $23,
        emergency_contact = $24, emergency_phone = $25, status = $26, notes = $27, updated_at = NOW()
      WHERE id = $28 RETURNING *
    `, [
      full_name, full_name_en, nationality, id_number, iqama_number, iqama_expiry,
      passport_number, passport_expiry, date_of_birth, hire_date, job_title,
      department_id, project_id || null, employment_type, base_salary, housing_allowance, transport_allowance,
      other_allowances, bank_account, bank_name, iban, phone, email, emergency_contact,
      emergency_phone, status, notes, id
    ]);

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await query(`DELETE FROM employees WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
