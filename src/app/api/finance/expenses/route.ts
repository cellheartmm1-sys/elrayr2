import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('project_id') ?? '';
    const category = searchParams.get('category') ?? '';
    const dateFrom = searchParams.get('date_from') ?? '';
    const dateTo = searchParams.get('date_to') ?? '';
    const approvalStatus = searchParams.get('approval_status') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (projectId) {
      conditions.push(`e.project_id = $${paramIndex}`);
      params.push(projectId);
      paramIndex++;
    }

    if (category) {
      conditions.push(`e.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`e.expense_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`e.expense_date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    if (approvalStatus) {
      conditions.push(`e.approval_status = $${paramIndex}`);
      params.push(approvalStatus);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM project_expenses e ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          e.id,
          e.project_id,
          p.name AS project_name,
          p.project_number,
          e.category,
          e.description,
          e.expense_date,
          e.amount,
          e.currency,
          e.vendor,
          e.invoice_number,
          e.approval_status,
          e.approved_by,
          approver.full_name AS approver_name,
          e.receipt_url,
          e.notes,
          e.created_at,
          e.updated_at
        FROM project_expenses e
        LEFT JOIN projects p ON p.id = e.project_id
        LEFT JOIN employees approver ON approver.id = e.approved_by
        ${where}
        ORDER BY e.expense_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Aggregate totals for the filtered set
    const totalsResult = await query(
      `SELECT
          SUM(e.amount) AS total_amount,
          COUNT(*) AS total_count,
          e.category,
          SUM(e.amount) AS category_total
        FROM project_expenses e
        ${where}
        GROUP BY e.category
        ORDER BY category_total DESC`,
      params
    );

    return NextResponse.json({
      data: dataResult.rows,
      totals: totalsResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/finance/expenses]', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
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
      currency = 'SAR',
      vendor,
      invoice_number,
      receipt_url,
      notes,
    } = body;

    if (!expense_date || !amount || !category) {
      return NextResponse.json(
        { error: 'category, expense_date, and amount are required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO project_expenses (
          project_id, category, description, expense_date, amount, currency,
          vendor, invoice_number, receipt_url, notes, approval_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
        RETURNING *`,
      [
        project_id ?? null,
        category,
        description ?? null,
        expense_date,
        amount,
        currency,
        vendor ?? null,
        invoice_number ?? null,
        receipt_url ?? null,
        notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/finance/expenses]', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
