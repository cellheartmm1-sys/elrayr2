import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? '';
    const clientId = searchParams.get('client_id') ?? '';
    const expiryAlert = searchParams.get('expiry_alert') ?? ''; // 'expired' | 'expiring_soon'
    const search = searchParams.get('search') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`mc.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (clientId) {
      conditions.push(`mc.client_id = $${paramIndex}`);
      params.push(clientId);
      paramIndex++;
    }

    if (expiryAlert === 'expired') {
      conditions.push(`mc.end_date < CURRENT_DATE`);
    } else if (expiryAlert === 'expiring_soon') {
      conditions.push(`mc.end_date >= CURRENT_DATE AND mc.end_date <= CURRENT_DATE + INTERVAL '30 days'`);
    }

    if (search) {
      conditions.push(`(mc.contract_number ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR mc.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM maintenance_contracts mc
        LEFT JOIN clients c ON c.id = mc.client_id
        ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          mc.id,
          mc.contract_number,
          mc.client_id,
          c.name AS client_name,
          c.phone AS client_phone,
          mc.description,
          mc.start_date,
          mc.end_date,
          mc.value,
          mc.payment_terms,
          mc.visit_frequency,
          mc.status,
          CASE
            WHEN mc.end_date < CURRENT_DATE THEN 'expired'
            WHEN mc.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'valid'
          END AS expiry_alert,
          (mc.end_date - CURRENT_DATE) AS days_until_expiry,
          mc.notes,
          mc.created_at,
          mc.updated_at
        FROM maintenance_contracts mc
        LEFT JOIN clients c ON c.id = mc.client_id
        ${where}
        ORDER BY mc.end_date ASC NULLS LAST
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/maintenance/contracts]', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance contracts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contract_number,
      client_id,
      description,
      start_date,
      end_date,
      value,
      payment_terms,
      visit_frequency,
      status = 'active',
      notes,
    } = body;

    if (!client_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'client_id, start_date, and end_date are required' },
        { status: 400 }
      );
    }

    if (contract_number) {
      const existing = await query(
        'SELECT id FROM maintenance_contracts WHERE contract_number = $1',
        [contract_number]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'Contract number already exists' },
          { status: 409 }
        );
      }
    }

    const result = await query(
      `INSERT INTO maintenance_contracts (
          contract_number, client_id, description, start_date, end_date,
          value, payment_terms, visit_frequency, status, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *`,
      [
        contract_number ?? null,
        client_id,
        description ?? null,
        start_date,
        end_date,
        value ?? null,
        payment_terms ?? null,
        visit_frequency ?? null,
        status,
        notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/maintenance/contracts]', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance contract' },
      { status: 500 }
    );
  }
}
