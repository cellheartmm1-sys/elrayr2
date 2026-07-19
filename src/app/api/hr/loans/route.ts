import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const employeeId = searchParams.get('employee_id') ?? '';
    const status = searchParams.get('status') ?? '';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (employeeId) {
      conditions.push(`l.employee_id = $${paramIndex}`);
      params.push(employeeId);
      paramIndex++;
    }

    if (status) {
      conditions.push(`l.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT
          l.id,
          l.employee_id,
          e.full_name AS employee_name,
          e.job_title AS employee_job_title,
          e.employee_number,
          l.loan_date,
          l.amount,
          l.monthly_deduction,
          l.paid_amount,
          l.repayment_method,
          l.status,
          l.notes,
          l.created_at,
          l.updated_at
        FROM employee_loans l
        JOIN employees e ON e.id = l.employee_id
        ${where}
        ORDER BY l.loan_date DESC`,
      params
    );

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('[GET /api/hr/loans]', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee loans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      amount,
      monthly_deduction = 0,
      repayment_method = 'salary_deduction',
      notes,
    } = body;

    if (!employee_id || !amount) {
      return NextResponse.json(
        { error: 'employee_id and amount are required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO employee_loans (
          employee_id, amount, monthly_deduction, repayment_method, status, notes
        ) VALUES ($1, $2, $3, $4, 'active', $5)
        RETURNING *`,
      [
        employee_id,
        Number(amount),
        Number(monthly_deduction),
        repayment_method,
        notes ?? null
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/hr/loans]', error);
    return NextResponse.json(
      { error: 'Failed to create employee loan' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, paid_amount, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Fetch existing
    const existing = await query('SELECT amount, paid_amount FROM employee_loans WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const currentPaid = Number(paid_amount ?? existing.rows[0].paid_amount);
    const amount = Number(existing.rows[0].amount);
    
    // Automatically update status to 'paid' if paid_amount >= amount
    const computedStatus = status ?? (currentPaid >= amount ? 'paid' : 'active');

    const result = await query(
      `UPDATE employee_loans
       SET paid_amount = $1, status = $2, notes = COALESCE($3, notes), updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [currentPaid, computedStatus, notes ?? null, id]
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('[PUT /api/hr/loans]', error);
    return NextResponse.json(
      { error: 'Failed to update employee loan' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await query('DELETE FROM employee_loans WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Loan deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/hr/loans]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete loan' }, { status: 500 });
  }
}
