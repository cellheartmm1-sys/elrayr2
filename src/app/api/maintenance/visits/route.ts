import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? '';
    const contractId = searchParams.get('contract_id') ?? '';
    const technicianId = searchParams.get('technician_id') ?? '';
    const dateFrom = searchParams.get('date_from') ?? '';
    const dateTo = searchParams.get('date_to') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`v.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (contractId) {
      conditions.push(`v.contract_id = $${paramIndex}`);
      params.push(contractId);
      paramIndex++;
    }

    if (technicianId) {
      conditions.push(`v.technician_id = $${paramIndex}`);
      params.push(technicianId);
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`v.scheduled_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`v.scheduled_date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM maintenance_visits v ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          v.id,
          v.contract_id,
          mc.contract_number,
          c.name AS client_name,
          c.phone AS client_phone,
          v.technician_id,
          e.full_name AS technician_name,
          v.scheduled_date,
          v.actual_date,
          v.status,
          v.visit_type,
          v.duration_hours,
          v.findings,
          v.actions_taken,
          v.next_visit_date,
          v.client_signature,
          v.notes,
          v.created_at,
          v.updated_at
        FROM maintenance_visits v
        JOIN maintenance_contracts mc ON mc.id = v.contract_id
        LEFT JOIN clients c ON c.id = mc.client_id
        LEFT JOIN employees e ON e.id = v.technician_id
        ${where}
        ORDER BY v.scheduled_date DESC
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
    console.error('[GET /api/maintenance/visits]', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance visits' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contract_id,
      technician_id,
      scheduled_date,
      actual_date,
      status = 'scheduled',
      visit_type,
      duration_hours,
      findings,
      actions_taken,
      next_visit_date,
      notes,
    } = body;

    if (!contract_id || !scheduled_date) {
      return NextResponse.json(
        { error: 'contract_id and scheduled_date are required' },
        { status: 400 }
      );
    }

    // Verify contract exists and is active
    const contract = await query(
      'SELECT id, status FROM maintenance_contracts WHERE id = $1',
      [contract_id]
    );
    if (contract.rows.length === 0) {
      return NextResponse.json({ error: 'Maintenance contract not found' }, { status: 404 });
    }

    const result = await query(
      `INSERT INTO maintenance_visits (
          contract_id, technician_id, scheduled_date, actual_date, status, visit_type,
          duration_hours, findings, actions_taken, next_visit_date, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *`,
      [
        contract_id,
        technician_id ?? null,
        scheduled_date,
        actual_date ?? null,
        status,
        visit_type ?? null,
        duration_hours ?? null,
        findings ?? null,
        actions_taken ?? null,
        next_visit_date ?? null,
        notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/maintenance/visits]', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance visit' },
      { status: 500 }
    );
  }
}
