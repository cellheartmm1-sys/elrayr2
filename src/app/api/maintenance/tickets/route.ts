import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? '';
    const urgency = searchParams.get('urgency') ?? '';
    const contractId = searchParams.get('contract_id') ?? '';
    const assignedTo = searchParams.get('assigned_to') ?? '';
    const dateFrom = searchParams.get('date_from') ?? '';
    const dateTo = searchParams.get('date_to') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`t.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (urgency) {
      conditions.push(`t.urgency = $${paramIndex}`);
      params.push(urgency);
      paramIndex++;
    }

    if (contractId) {
      conditions.push(`t.contract_id = $${paramIndex}`);
      params.push(contractId);
      paramIndex++;
    }

    if (assignedTo) {
      conditions.push(`t.assigned_to = $${paramIndex}`);
      params.push(assignedTo);
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`t.reported_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`t.reported_date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM fault_tickets t ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          t.id,
          t.ticket_number,
          t.contract_id,
          mc.contract_number,
          c.name AS client_name,
          t.title,
          t.description,
          t.category,
          t.urgency,
          t.status,
          t.reported_date,
          t.reported_by,
          reporter.full_name AS reporter_name,
          t.assigned_to,
          technician.full_name AS technician_name,
          t.resolved_date,
          t.resolution_notes,
          t.estimated_hours,
          t.actual_hours,
          t.created_at,
          t.updated_at
        FROM fault_tickets t
        LEFT JOIN maintenance_contracts mc ON mc.id = t.contract_id
        LEFT JOIN clients c ON c.id = mc.client_id
        LEFT JOIN employees reporter ON reporter.id = t.reported_by
        LEFT JOIN employees technician ON technician.id = t.assigned_to
        ${where}
        ORDER BY
          CASE t.urgency
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
          END,
          t.reported_date DESC
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
    console.error('[GET /api/maintenance/tickets]', error);
    return NextResponse.json(
      { error: 'Failed to fetch fault tickets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ticket_number,
      contract_id,
      title,
      description,
      category,
      urgency = 'medium',
      reported_date,
      reported_by,
      assigned_to,
      estimated_hours,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO fault_tickets (
          ticket_number, contract_id, title, description, category, urgency,
          status, reported_date, reported_by, assigned_to, estimated_hours
        ) VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,$10)
        RETURNING *`,
      [
        ticket_number ?? null,
        contract_id ?? null,
        title,
        description ?? null,
        category ?? null,
        urgency,
        reported_date ?? new Date().toISOString().split('T')[0],
        reported_by ?? null,
        assigned_to ?? null,
        estimated_hours ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/maintenance/tickets]', error);
    return NextResponse.json(
      { error: 'Failed to create fault ticket' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      assigned_to,
      urgency,
      resolved_date,
      resolution_notes,
      actual_hours,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      params.push(assigned_to);
    }
    if (urgency !== undefined) {
      updates.push(`urgency = $${paramIndex++}`);
      params.push(urgency);
    }
    if (resolved_date !== undefined) {
      updates.push(`resolved_date = $${paramIndex++}`);
      params.push(resolved_date);
    }
    if (resolution_notes !== undefined) {
      updates.push(`resolution_notes = $${paramIndex++}`);
      params.push(resolution_notes);
    }
    if (actual_hours !== undefined) {
      updates.push(`actual_hours = $${paramIndex++}`);
      params.push(actual_hours);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);

    const result = await query(
      `UPDATE fault_tickets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      [...params, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[PUT /api/maintenance/tickets]', error);
    return NextResponse.json(
      { error: 'Failed to update fault ticket' },
      { status: 500 }
    );
  }
}
