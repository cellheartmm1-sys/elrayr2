import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

// Actual schema: asset_code, asset_name, asset_type, brand, model, serial_number,
//                purchase_date, purchase_cost, assigned_to (REFERENCES employees),
//                project_id, assignment_date, expected_return_date, condition, status, notes, created_at

async function ensureAssetsSchema() {
  try {
    await query(`
      ALTER TABLE personal_assets 
        ADD COLUMN IF NOT EXISTS asset_code VARCHAR(50),
        ADD COLUMN IF NOT EXISTS asset_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS asset_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
        ADD COLUMN IF NOT EXISTS model VARCHAR(100),
        ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100),
        ADD COLUMN IF NOT EXISTS purchase_date DATE,
        ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC,
        ADD COLUMN IF NOT EXISTS condition VARCHAR(50),
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'available',
        ADD COLUMN IF NOT EXISTS assigned_to UUID,
        ADD COLUMN IF NOT EXISTS assignment_date DATE,
        ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
  } catch (err) {
    console.error('Failed to auto-alter personal_assets schema:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureAssetsSchema();
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
    await ensureAssetsSchema();
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

    if (!asset_name) return NextResponse.json({ error: 'اسم العهدة مطلوب' }, { status: 400 });

    const finalCode = asset_code || `AST-${Math.floor(1000 + Math.random() * 9000)}`;

    if (asset_code) {
      const existing = await query('SELECT id FROM personal_assets WHERE asset_code = $1', [asset_code]);
      if (existing.rows.length > 0) return NextResponse.json({ error: 'كود العهدة مستخدم مسبقاً' }, { status: 400 });
    }

    const rawCost = purchase_cost ?? purchase_value;
    const resolvedCost = (rawCost !== undefined && rawCost !== '' && rawCost !== null) ? Number(rawCost) : null;
    const rawAssignDate = assignment_date ?? assigned_date;
    const resolvedAssignmentDate = (rawAssignDate !== undefined && rawAssignDate !== '') ? rawAssignDate : null;
    const resolvedPurchaseDate = (purchase_date !== undefined && purchase_date !== '') ? purchase_date : null;
    const resolvedAssignedTo = (assigned_to !== undefined && assigned_to !== '') ? assigned_to : null;

    const result = await query(
      `INSERT INTO personal_assets (
          asset_code, asset_name, asset_type, brand, model, serial_number, purchase_date,
          purchase_cost, condition, status, assigned_to, assignment_date, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *`,
      [
        finalCode,
        asset_name,
        asset_type || null,
        brand || null,
        model || null,
        serial_number || null,
        resolvedPurchaseDate,
        resolvedCost,
        condition || null,
        status || 'available',
        resolvedAssignedTo,
        resolvedAssignmentDate,
        notes || null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/hr/assets]', error);
    return NextResponse.json({ error: error?.message || 'فشل حفظ العهدة' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, asset_code, asset_name, asset_type, brand, model, serial_number, condition, status, assigned_to, notes } = body;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const result = await query(
      `UPDATE personal_assets
       SET asset_code = COALESCE($1, asset_code),
           asset_name = COALESCE($2, asset_name),
           asset_type = COALESCE($3, asset_type),
           brand = COALESCE($4, brand),
           model = COALESCE($5, model),
           serial_number = COALESCE($6, serial_number),
           condition = COALESCE($7, condition),
           status = COALESCE($8, status),
           assigned_to = COALESCE($9, assigned_to),
           notes = COALESCE($10, notes)
       WHERE id = $11 RETURNING *`,
      [asset_code ?? null, asset_name ?? null, asset_type ?? null, brand ?? null, model ?? null, serial_number ?? null, condition ?? null, status ?? null, assigned_to ?? null, notes ?? null, id]
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('[PUT /api/hr/assets]', error);
    return NextResponse.json({ error: error.message || 'Failed to update asset' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await query('DELETE FROM personal_assets WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/hr/assets]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete asset' }, { status: 500 });
  }
}
