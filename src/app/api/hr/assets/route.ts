import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

// Actual schema: asset_code, asset_name, asset_type, brand, model, serial_number,
//                purchase_date, purchase_cost, assigned_to (REFERENCES employees),
//                project_id, assignment_date, expected_return_date, condition, status, notes, created_at

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? '';
    const employeeId = searchParams.get('employee_id') ?? '';
    const assetType = searchParams.get('asset_type') ?? '';
    const search = searchParams.get('search') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) { conditions.push(`a.status = $${paramIndex}`); params.push(status); paramIndex++; }
    if (employeeId) { conditions.push(`a.assigned_to = $${paramIndex}`); params.push(employeeId); paramIndex++; }
    if (assetType) { conditions.push(`a.asset_type = $${paramIndex}`); params.push(assetType); paramIndex++; }
    if (search) {
      conditions.push(`(a.asset_name ILIKE $${paramIndex} OR a.asset_code ILIKE $${paramIndex} OR a.serial_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`); paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM personal_assets a ${where}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          a.id,
          a.asset_code,
          a.asset_name,
          a.asset_type,
          a.brand,
          a.model,
          a.serial_number,
          a.purchase_date,
          a.purchase_cost,
          a.purchase_cost AS purchase_value,
          a.condition,
          a.status,
          a.assigned_to,
          e.employee_number,
          e.full_name AS employee_name,
          e.full_name AS assigned_to_name,
          e.job_title AS assigned_to_job,
          a.assignment_date,
          a.assignment_date AS assigned_date,
          a.expected_return_date,
          a.notes,
          a.created_at
        FROM personal_assets a
        LEFT JOIN employees e ON e.id = a.assigned_to
        ${where}
        ORDER BY a.asset_name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/hr/assets]', error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      asset_code,
      asset_name,
      asset_type,
      brand,
      model,
      serial_number,
      purchase_date,
      purchase_cost,
      purchase_value, // legacy alias → purchase_cost
      condition,
      status = 'available',
      assigned_to,
      assignment_date,
      assigned_date,  // legacy alias
      notes,
    } = body;

    if (!asset_name) return NextResponse.json({ error: 'asset_name is required' }, { status: 400 });

    if (asset_code) {
      const existing = await query('SELECT id FROM personal_assets WHERE asset_code = $1', [asset_code]);
      if (existing.rows.length > 0) return NextResponse.json({ error: 'Asset code already exists' }, { status: 409 });
    }

    const resolvedCost = purchase_cost ?? purchase_value ?? null;
    const resolvedAssignmentDate = assignment_date ?? assigned_date ?? null;

    const result = await query(
      `INSERT INTO personal_assets (
          asset_code, asset_name, asset_type, brand, model, serial_number, purchase_date,
          purchase_cost, condition, status, assigned_to, assignment_date, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *`,
      [
        asset_code ?? null, asset_name, asset_type ?? null,
        brand ?? null, model ?? null, serial_number ?? null,
        purchase_date ?? null, resolvedCost,
        condition ?? null, status,
        assigned_to ?? null, resolvedAssignmentDate, notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/hr/assets]', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}
