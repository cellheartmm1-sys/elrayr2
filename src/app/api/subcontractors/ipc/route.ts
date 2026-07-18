import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

// Actual subcontractor_ipc schema:
// ipc_number, contract_id (NOT NULL FK), subcontractor_id (NOT NULL FK),
// project_id (NOT NULL FK), ipc_date, period_from, period_to,
// items_total, retention_amount, previous_payments, net_payable,
// status, approved_by, payment_date, notes, created_at

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

    if (status) { conditions.push(`i.status = $${paramIndex}`); params.push(status); paramIndex++; }
    if (subcontractorId) { conditions.push(`i.subcontractor_id = $${paramIndex}`); params.push(subcontractorId); paramIndex++; }
    if (projectId) { conditions.push(`i.project_id = $${paramIndex}`); params.push(projectId); paramIndex++; }
    if (dateFrom) { conditions.push(`i.ipc_date >= $${paramIndex}`); params.push(dateFrom); paramIndex++; }
    if (dateTo) { conditions.push(`i.ipc_date <= $${paramIndex}`); params.push(dateTo); paramIndex++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM subcontractor_ipc i ${where}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          i.id,
          i.ipc_number,
          i.contract_id,
          i.subcontractor_id,
          s.name AS subcontractor_name,
          s.specialty AS subcontractor_specialty,
          i.project_id,
          p.name AS project_name,
          p.code AS project_code,
          i.ipc_date,
          i.period_from,
          i.period_to,
          i.items_total,
          i.retention_amount,
          i.previous_payments,
          i.net_payable,
          i.status,
          i.payment_date,
          i.notes,
          i.created_at
        FROM subcontractor_ipc i
        LEFT JOIN subcontractors s ON s.id = i.subcontractor_id
        LEFT JOIN projects p ON p.id = i.project_id
        ${where}
        ORDER BY i.ipc_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/subcontractors/ipc]', error);
    return NextResponse.json({ error: 'Failed to fetch IPC records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ipc_number,
      contract_id,
      subcontractor_id,
      project_id,
      ipc_date,
      period_from,
      period_to,
      // Accept both old and new field names
      items_total,
      current_amount,     // legacy alias → items_total
      retention_amount,
      previous_payments,
      previous_amount,    // legacy alias → previous_payments
      net_payable,
      net_amount,         // legacy alias → net_payable
      status = 'draft',
      notes,
    } = body;

    if (!subcontractor_id || !project_id || !ipc_date) {
      return NextResponse.json({ error: 'subcontractor_id, project_id, and ipc_date are required' }, { status: 400 });
    }

    const resolvedItemsTotal = items_total ?? current_amount ?? 0;
    const resolvedPreviousPayments = previous_payments ?? previous_amount ?? 0;
    const resolvedRetentionAmount = retention_amount ?? 0;
    const resolvedNetPayable = net_payable ?? net_amount ?? (resolvedItemsTotal - resolvedRetentionAmount);
    const generatedNumber = ipc_number || `SIPC-${Math.floor(100000 + Math.random() * 900000)}`;

    // contract_id is NOT NULL in schema — if not provided, try to find the active contract
    let resolvedContractId = contract_id ?? null;
    if (!resolvedContractId && subcontractor_id && project_id) {
      const contractRes = await query(
        `SELECT id FROM subcontractor_contracts WHERE subcontractor_id = $1 AND project_id = $2 AND status = 'active' LIMIT 1`,
        [subcontractor_id, project_id]
      );
      if (contractRes.rows.length > 0) {
        resolvedContractId = contractRes.rows[0].id;
      }
    }

    if (!resolvedContractId) {
      return NextResponse.json({ error: 'No active contract found for this subcontractor and project. Please create a contract first.' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO subcontractor_ipc (
          ipc_number, contract_id, subcontractor_id, project_id, ipc_date,
          period_from, period_to, items_total, retention_amount,
          previous_payments, net_payable, status, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *`,
      [
        generatedNumber, resolvedContractId, subcontractor_id, project_id, ipc_date,
        period_from ?? null, period_to ?? null,
        resolvedItemsTotal, resolvedRetentionAmount,
        resolvedPreviousPayments, resolvedNetPayable, status, notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/subcontractors/ipc]', error);
    return NextResponse.json({ error: 'Failed to create IPC record' }, { status: 500 });
  }
}
