import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

// Actual schema: ticket_number, contract_id, client_name, site_address,
//                reported_by (TEXT), phone, report_date, fault_description,
//                urgency, assigned_technician_id (UUID), status,
//                resolution_notes, resolved_date, created_at

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? '';
    const urgency = searchParams.get('urgency') ?? '';
    const contractId = searchParams.get('contract_id') ?? '';
    const dateFrom = searchParams.get('date_from') ?? '';
    const dateTo = searchParams.get('date_to') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) { conditions.push(`t.status = $${paramIndex}`); params.push(status); paramIndex++; }
    if (urgency) { conditions.push(`t.urgency = $${paramIndex}`); params.push(urgency); paramIndex++; }
    if (contractId) { conditions.push(`t.contract_id = $${paramIndex}`); params.push(contractId); paramIndex++; }
    if (dateFrom) { conditions.push(`t.report_date >= $${paramIndex}`); params.push(dateFrom); paramIndex++; }
    if (dateTo) { conditions.push(`t.report_date <= $${paramIndex}`); params.push(dateTo); paramIndex++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM fault_tickets t ${where}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          t.id,
          t.ticket_number,
          t.contract_id,
          mc.contract_number,
          mc.client_name,
          t.site_address,
          t.reported_by,
          t.phone,
          t.report_date,
          t.fault_description,
          t.urgency,
          t.status,
          t.assigned_technician_id,
          e.full_name AS technician_name,
          t.resolution_notes,
          t.resolved_date,
          t.created_at
        FROM fault_tickets t
        LEFT JOIN maintenance_contracts mc ON mc.id = t.contract_id
        LEFT JOIN employees e ON e.id = t.assigned_technician_id
        ${where}
        ORDER BY
          CASE t.urgency
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
          END,
          t.report_date DESC NULLS LAST
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/maintenance/tickets]', error);
    return NextResponse.json({ error: 'Failed to fetch fault tickets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ticket_number,
      contract_id,
      client_name,
      site_address,
      reported_by,   // TEXT - not UUID
      phone,
      fault_description,
      urgency = 'medium',
      status = 'open',
      assigned_technician_id,
    } = body;

    if (!fault_description) {
      return NextResponse.json({ error: 'fault_description is required' }, { status: 400 });
    }

    const generatedNumber = ticket_number || `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    const result = await query(
      `INSERT INTO fault_tickets (
          ticket_number, contract_id, client_name, site_address,
          reported_by, phone, report_date, fault_description,
          urgency, status, assigned_technician_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *`,
      [
        generatedNumber,
        contract_id ?? null,
        client_name ?? null,
        site_address ?? null,
        reported_by ?? null,
        phone ?? null,
        new Date().toISOString().split('T')[0],
        fault_description,
        urgency,
        status,
        assigned_technician_id ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/maintenance/tickets]', error);
    return NextResponse.json({ error: 'Failed to create fault ticket' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, assigned_technician_id, urgency, resolved_date, resolution_notes } = body;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status !== undefined) { updates.push(`status = $${paramIndex++}`); params.push(status); }
    if (assigned_technician_id !== undefined) { updates.push(`assigned_technician_id = $${paramIndex++}`); params.push(assigned_technician_id); }
    if (urgency !== undefined) { updates.push(`urgency = $${paramIndex++}`); params.push(urgency); }
    if (resolved_date !== undefined) { updates.push(`resolved_date = $${paramIndex++}`); params.push(resolved_date); }
    if (resolution_notes !== undefined) { updates.push(`resolution_notes = $${paramIndex++}`); params.push(resolution_notes); }

    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    const result = await query(
      `UPDATE fault_tickets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      [...params, id]
    );

    if (result.rows.length === 0) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[PUT /api/maintenance/tickets]', error);
    return NextResponse.json({ error: 'Failed to update fault ticket' }, { status: 500 });
  }
}
