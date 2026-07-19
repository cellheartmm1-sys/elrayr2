import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('project_id') ?? '';
    const subcontractorId = searchParams.get('subcontractor_id') ?? '';
    const status = searchParams.get('status') ?? '';
    const debtType = searchParams.get('debt_type') ?? '';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (projectId) {
      conditions.push(`d.project_id = $${paramIndex}`);
      params.push(projectId);
      paramIndex++;
    }

    if (subcontractorId) {
      conditions.push(`d.subcontractor_id = $${paramIndex}`);
      params.push(subcontractorId);
      paramIndex++;
    }

    if (status) {
      conditions.push(`d.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (debtType) {
      conditions.push(`d.debt_type = $${paramIndex}`);
      params.push(debtType);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT
          d.id,
          d.creditor_name,
          d.debt_type,
          d.subcontractor_id,
          s.name AS subcontractor_name,
          d.project_id,
          p.name AS project_name,
          p.code AS project_code,
          d.amount,
          d.due_date,
          d.paid_amount,
          d.status,
          d.notes,
          d.created_at,
          d.updated_at
        FROM company_debts d
        LEFT JOIN projects p ON p.id = d.project_id
        LEFT JOIN subcontractors s ON s.id = d.subcontractor_id
        ${where}
        ORDER BY d.created_at DESC`,
      params
    );

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('[GET /api/finance/debts]', error);
    return NextResponse.json(
      { error: 'Failed to fetch company debts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      creditor_name,
      debt_type = 'other',
      subcontractor_id,
      project_id,
      amount,
      due_date,
      notes,
    } = body;

    if (!creditor_name || !amount) {
      return NextResponse.json(
        { error: 'creditor_name and amount are required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO company_debts (
          creditor_name, debt_type, subcontractor_id, project_id, amount,
          due_date, paid_amount, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, 0, 'unpaid', $7)
        RETURNING *`,
      [
        creditor_name,
        debt_type,
        subcontractor_id || null,
        project_id || null,
        Number(amount),
        due_date || null,
        notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/finance/debts]', error);
    return NextResponse.json(
      { error: 'Failed to create company debt' },
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
    const existing = await query('SELECT amount, paid_amount FROM company_debts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Debt record not found' }, { status: 404 });
    }

    const currentPaid = Number(paid_amount ?? existing.rows[0].paid_amount);
    const amount = Number(existing.rows[0].amount);

    let computedStatus = status;
    if (!computedStatus) {
      if (currentPaid >= amount) computedStatus = 'paid';
      else if (currentPaid > 0) computedStatus = 'partially_paid';
      else computedStatus = 'unpaid';
    }

    const result = await query(
      `UPDATE company_debts
       SET paid_amount = $1, status = $2, notes = COALESCE($3, notes), updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [currentPaid, computedStatus, notes ?? null, id]
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('[PUT /api/finance/debts]', error);
    return NextResponse.json(
      { error: 'Failed to update company debt' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await query('DELETE FROM company_debts WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Debt deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/finance/debts]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete debt' }, { status: 500 });
  }
}
