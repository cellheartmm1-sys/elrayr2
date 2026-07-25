import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('project_id') ?? '';
    const category = searchParams.get('category') ?? '';
    const dateFrom = searchParams.get('date_from') ?? '';
    const dateTo = searchParams.get('date_to') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (projectId) { conditions.push(`e.project_id = $${paramIndex}`); params.push(projectId); paramIndex++; }
    if (category) { conditions.push(`e.category = $${paramIndex}`); params.push(category); paramIndex++; }
    if (dateFrom) { conditions.push(`e.expense_date >= $${paramIndex}`); params.push(dateFrom); paramIndex++; }
    if (dateTo) { conditions.push(`e.expense_date <= $${paramIndex}`); params.push(dateTo); paramIndex++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM project_expenses e ${where}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          e.id,
          e.project_id,
          p.name AS project_name,
          p.code AS project_code,
          e.category,
          e.description,
          e.expense_date,
          e.amount,
          e.supplier,
          e.invoice_number,
          e.approved_by,
          e.created_at
        FROM project_expenses e
        LEFT JOIN projects p ON p.id = e.project_id
        ${where}
        ORDER BY e.expense_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const totalsResult = await query(
      `SELECT e.category, SUM(e.amount) AS category_total, COUNT(*) AS total_count
        FROM project_expenses e ${where}
        GROUP BY e.category ORDER BY category_total DESC`,
      params
    );

    return NextResponse.json({
      data: dataResult.rows,
      totals: totalsResult.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/finance/expenses]', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      category,
      description,
      expense_date,
      amount,
      supplier,
      vendor,       // legacy alias → supplier
      invoice_number,
      notes,
    } = body;

    if (!expense_date || !amount || !category) {
      return NextResponse.json({ error: 'category, expense_date, and amount are required' }, { status: 400 });
    }

    const cleanProjectId = project_id && typeof project_id === 'string' && project_id.trim() !== '' ? project_id : null;

    const result = await query(
      `INSERT INTO project_expenses (
          project_id, category, description, expense_date, amount,
          supplier, invoice_number
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`,
      [
        cleanProjectId,
        category,
        description ?? null,
        expense_date,
        amount,
        resolvedSupplier,
        invoice_number ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/finance/expenses]', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, project_id, category, description, expense_date, amount, supplier, invoice_number } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const result = await query(
      `UPDATE project_expenses
       SET project_id = COALESCE($1, project_id),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           expense_date = COALESCE($4, expense_date),
           amount = COALESCE($5, amount),
           supplier = COALESCE($6, supplier),
           invoice_number = COALESCE($7, invoice_number)
       WHERE id = $8 RETURNING *`,
      [project_id ?? null, category ?? null, description ?? null, expense_date ?? null, amount ?? null, supplier ?? null, invoice_number ?? null, id]
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('[PUT /api/finance/expenses]', error);
    return NextResponse.json({ error: error.message || 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await query('DELETE FROM project_expenses WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/finance/expenses]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete expense' }, { status: 500 });
  }
}
