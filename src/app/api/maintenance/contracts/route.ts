import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

async function ensureContractsSchema() {
  try {
    await query(`
      ALTER TABLE maintenance_contracts
        ADD COLUMN IF NOT EXISTS civil_defense_license_number TEXT,
        ADD COLUMN IF NOT EXISTS civil_defense_expiry_date DATE;
    `);
  } catch (err) {
    console.error('Failed to alter maintenance_contracts schema:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureContractsSchema();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? '';
    const expiryAlert = searchParams.get('expiry_alert') ?? '';
    const civilDefenseAlert = searchParams.get('civil_defense_alert') ?? '';
    const search = searchParams.get('search') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) { conditions.push(`mc.status = $${paramIndex}`); params.push(status); paramIndex++; }

    if (expiryAlert === 'expired') {
      conditions.push(`mc.end_date < CURRENT_DATE`);
    } else if (expiryAlert === 'expiring_soon') {
      conditions.push(`mc.end_date >= CURRENT_DATE AND mc.end_date <= CURRENT_DATE + INTERVAL '30 days'`);
    }

    if (civilDefenseAlert === 'expiring_soon') {
      conditions.push(`mc.civil_defense_expiry_date <= CURRENT_DATE + INTERVAL '30 days'`);
    }

    if (search) {
      conditions.push(`(mc.contract_number ILIKE $${paramIndex} OR mc.client_name ILIKE $${paramIndex} OR mc.site_address ILIKE $${paramIndex} OR mc.civil_defense_license_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM maintenance_contracts mc ${where}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          mc.id,
          mc.contract_number,
          mc.project_id,
          mc.client_name,
          mc.client_contact,
          mc.client_phone,
          mc.site_address,
          mc.system_type,
          mc.start_date,
          mc.end_date,
          mc.annual_value,
          mc.visit_frequency,
          mc.status,
          mc.notes,
          mc.civil_defense_license_number,
          mc.civil_defense_expiry_date,
          mc.created_at,
          CASE
            WHEN mc.end_date < CURRENT_DATE THEN 'expired'
            WHEN mc.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'valid'
          END AS expiry_alert,
          (mc.end_date - CURRENT_DATE) AS days_until_expiry,
          CASE
            WHEN mc.civil_defense_expiry_date IS NULL THEN 'none'
            WHEN mc.civil_defense_expiry_date < CURRENT_DATE THEN 'expired'
            WHEN mc.civil_defense_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'valid'
          END AS civil_defense_alert,
          (mc.civil_defense_expiry_date - CURRENT_DATE) AS days_until_civil_defense_expiry
        FROM maintenance_contracts mc
        ${where}
        ORDER BY mc.end_date ASC NULLS LAST
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/maintenance/contracts]', error);
    return NextResponse.json({ error: 'Failed to fetch maintenance contracts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureContractsSchema();
    const body = await request.json();
    const {
      contract_number,
      project_id,
      client_name,
      client_contact,
      client_phone,
      site_address,
      system_type,
      start_date,
      end_date,
      annual_value,
      visit_frequency,
      status = 'active',
      civil_defense_license_number,
      civil_defense_expiry_date,
      notes,
    } = body;

    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 });
    }

    const generatedNumber = contract_number || `CONT-${Math.floor(100000 + Math.random() * 900000)}`;

    const result = await query(
      `INSERT INTO maintenance_contracts (
          contract_number, project_id, client_name, client_contact, client_phone,
          site_address, system_type, start_date, end_date,
          annual_value, visit_frequency, status, civil_defense_license_number, civil_defense_expiry_date, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING *`,
      [
        generatedNumber,
        project_id ?? null,
        client_name ?? null,
        client_contact ?? null,
        client_phone ?? null,
        site_address ?? null,
        system_type ?? null,
        start_date,
        end_date,
        annual_value ?? null,
        visit_frequency ?? null,
        status,
        civil_defense_license_number ?? null,
        civil_defense_expiry_date ?? null,
        notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/maintenance/contracts]', error);
    return NextResponse.json({ error: 'Failed to create maintenance contract' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureContractsSchema();
    const body = await request.json();
    const {
      id, contract_number, client_name, system_type, start_date, end_date, annual_value,
      visit_frequency, status, civil_defense_license_number, civil_defense_expiry_date, notes
    } = body;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const result = await query(
      `UPDATE maintenance_contracts
       SET contract_number = COALESCE($1, contract_number),
           client_name = COALESCE($2, client_name),
           system_type = COALESCE($3, system_type),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           annual_value = COALESCE($6, annual_value),
           visit_frequency = COALESCE($7, visit_frequency),
           status = COALESCE($8, status),
           civil_defense_license_number = COALESCE($9, civil_defense_license_number),
           civil_defense_expiry_date = COALESCE($10, civil_defense_expiry_date),
           notes = COALESCE($11, notes)
       WHERE id = $12 RETURNING *`,
      [
        contract_number ?? null, client_name ?? null, system_type ?? null,
        start_date ?? null, end_date ?? null, annual_value ?? null,
        visit_frequency ?? null, status ?? null,
        civil_defense_license_number ?? null, civil_defense_expiry_date ?? null,
        notes ?? null, id
      ]
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('[PUT /api/maintenance/contracts]', error);
    return NextResponse.json({ error: error.message || 'Failed to update contract' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await query('DELETE FROM maintenance_contracts WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Contract deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/maintenance/contracts]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete contract' }, { status: 500 });
  }
}
