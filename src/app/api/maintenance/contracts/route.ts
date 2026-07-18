import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

// Actual schema: contract_number, project_id, client_name, client_contact, client_phone,
//                site_address, system_type, start_date, end_date, annual_value,
//                visit_frequency, status, notes, created_at

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? '';
    const expiryAlert = searchParams.get('expiry_alert') ?? '';
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

    if (search) {
      conditions.push(`(mc.contract_number ILIKE $${paramIndex} OR mc.client_name ILIKE $${paramIndex} OR mc.site_address ILIKE $${paramIndex})`);
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
          mc.created_at,
          CASE
            WHEN mc.end_date < CURRENT_DATE THEN 'expired'
            WHEN mc.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'valid'
          END AS expiry_alert,
          (mc.end_date - CURRENT_DATE) AS days_until_expiry
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
          annual_value, visit_frequency, status, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
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
        notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/maintenance/contracts]', error);
    return NextResponse.json({ error: 'Failed to create maintenance contract' }, { status: 500 });
  }
}
