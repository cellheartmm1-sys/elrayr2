import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, project_id, month, year, allocation_percentage, notes } = body;

    if (!employee_id || !project_id || !month || !year || !allocation_percentage) {
      return NextResponse.json(
        { error: 'جميع الحقول المطلوبة يجب إدخالها' },
        { status: 400 }
      );
    }

    // Get employee base salary to calculate allocated amount
    const empRes = await query('SELECT base_salary FROM employees WHERE id = $1', [employee_id]);
    if (empRes.rows.length === 0) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }
    const baseSalary = Number(empRes.rows[0].base_salary || 0);
    const allocated_amount = baseSalary * (Number(allocation_percentage) / 100);

    const result = await query(
      `INSERT INTO salary_allocations (
        employee_id, project_id, month, year, allocation_percentage, allocated_amount, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (employee_id, project_id, month, year) 
       DO UPDATE SET 
         allocation_percentage = EXCLUDED.allocation_percentage,
         allocated_amount = EXCLUDED.allocated_amount,
         notes = EXCLUDED.notes
       RETURNING *`,
      [employee_id, project_id, Number(month), Number(year), Number(allocation_percentage), allocated_amount, notes || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    const err = error as Error;
    console.error('[POST /api/hr/allocations]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, employee_id, project_id, month, year, allocation_percentage, notes } = body;

    if (!id || !employee_id || !project_id || !month || !year || !allocation_percentage) {
      return NextResponse.json(
        { error: 'جميع الحقول المطلوبة يجب إدخالها' },
        { status: 400 }
      );
    }

    // Get employee base salary to calculate allocated amount
    const empRes = await query('SELECT base_salary FROM employees WHERE id = $1', [employee_id]);
    const baseSalary = Number(empRes.rows[0]?.base_salary || 0);
    const allocated_amount = baseSalary * (Number(allocation_percentage) / 100);

    const result = await query(
      `UPDATE salary_allocations SET
        project_id = $1,
        month = $2,
        year = $3,
        allocation_percentage = $4,
        allocated_amount = $5,
        notes = $6
      WHERE id = $7 RETURNING *`,
      [project_id, Number(month), Number(year), Number(allocation_percentage), allocated_amount, notes || null, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'التوزيع غير موجود' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    const err = error as Error;
    console.error('[PUT /api/hr/allocations]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await query('DELETE FROM salary_allocations WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error('[DELETE /api/hr/allocations]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
