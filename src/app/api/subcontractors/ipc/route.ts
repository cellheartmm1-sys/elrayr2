import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? '';
    const subcontractorId = searchParams.get('subcontractor_id') ?? '';
    const projectId = searchParams.get('project_id') ?? '';
    const dateFrom = searchParams.get('date_from') ?? '';
    const dateTo = searchParams.get('date_to') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`i.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (subcontractorId) {
      conditions.push(`i.subcontractor_id = $${paramIndex}`);
      params.push(subcontractorId);
      paramIndex++;
    }

    if (projectId) {
      conditions.push(`i.project_id = $${paramIndex}`);
      params.push(projectId);
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`i.ipc_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`i.ipc_date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM subcontractor_ipc i ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          i.id,
          i.ipc_number,
          i.subcontractor_id,
          s.name AS subcontractor_name,
          s.specialty AS subcontractor_specialty,
          i.project_id,
          p.name AS project_name,
          p.project_number,
          i.ipc_date,
          i.period_from,
          i.period_to,
          i.contract_value,
          i.previous_amount,
          i.current_amount,
          i.cumulative_amount,
          i.retention_percentage,
          i.retention_amount,
          i.net_amount,
          i.status,
          i.submitted_date,
          i.approved_date,
          i.paid_date,
          i.notes,
          i.created_at,
          i.updated_at
        FROM subcontractor_ipc i
        JOIN subcontractors s ON s.id = i.subcontractor_id
        LEFT JOIN projects p ON p.id = i.project_id
        ${where}
        ORDER BY i.ipc_date DESC
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
    console.error('[GET /api/subcontractors/ipc]', error);
    return NextResponse.json(
      { error: 'Failed to fetch subcontractor IPC records' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ipc_number,
      subcontractor_id,
      project_id,
      ipc_date,
      period_from,
      period_to,
      contract_value,
      previous_amount = 0,
      current_amount,
      cumulative_amount,
      retention_percentage = 0,
      retention_amount,
      net_amount,
      status = 'draft',
      submitted_date,
      notes,
    } = body;

    if (!subcontractor_id || !ipc_date || !current_amount) {
      return NextResponse.json(
        { error: 'subcontractor_id, ipc_date, and current_amount are required' },
        { status: 400 }
      );
    }

    // Verify subcontractor exists
    const sub = await query('SELECT id FROM subcontractors WHERE id = $1', [subcontractor_id]);
    if (sub.rows.length === 0) {
      return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 });
    }

    const retentionAmt = retention_amount ?? current_amount * (retention_percentage / 100);
    const netAmt = net_amount ?? current_amount - retentionAmt;

    const result = await query(
      `INSERT INTO subcontractor_ipc (
          ipc_number, subcontractor_id, project_id, ipc_date, period_from, period_to,
          contract_value, previous_amount, current_amount, cumulative_amount,
          retention_percentage, retention_amount, net_amount, status, submitted_date, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING *`,
      [
        ipc_number ?? null,
        subcontractor_id,
        project_id ?? null,
        ipc_date,
        period_from ?? null,
        period_to ?? null,
        contract_value ?? null,
        previous_amount,
        current_amount,
        cumulative_amount ?? null,
        retention_percentage,
        retentionAmt,
        netAmt,
        status,
        submitted_date ?? null,
        notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/subcontractors/ipc]', error);
    return NextResponse.json(
      { error: 'Failed to create subcontractor IPC' },
      { status: 500 }
    );
  }
}
