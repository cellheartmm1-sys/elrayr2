import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

async function ensureClientIpcSchema() {
  try {
    await query(`
      ALTER TABLE client_ipc
        ADD COLUMN IF NOT EXISTS advance_deduction_percentage NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS advance_deduction_amount NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS wht_percentage NUMERIC(5,2) DEFAULT 1,
        ADD COLUMN IF NOT EXISTS wht_amount NUMERIC(15,2) DEFAULT 0;
    `);
  } catch (err) {
    console.error('Failed to alter client_ipc schema:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureClientIpcSchema();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? '';
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
    if (projectId) { conditions.push(`i.project_id = $${paramIndex}`); params.push(projectId); paramIndex++; }
    if (dateFrom) { conditions.push(`i.ipc_date >= $${paramIndex}`); params.push(dateFrom); paramIndex++; }
    if (dateTo) { conditions.push(`i.ipc_date <= $${paramIndex}`); params.push(dateTo); paramIndex++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM client_ipc i ${where}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          i.id,
          i.ipc_number,
          i.project_id,
          p.name AS project_name,
          p.code AS project_code,
          i.ipc_date,
          i.period_from,
          i.period_to,
          i.items_total,
          i.vat_percentage,
          i.vat_amount,
          i.retention_percentage,
          i.retention_amount,
          i.advance_deduction_percentage,
          i.advance_deduction_amount,
          i.wht_percentage,
          i.wht_amount,
          i.previous_payments,
          i.net_payable,
          i.status,
          i.submitted_date,
          i.consultant_approval_date,
          i.client_approval_date,
          i.payment_received_date,
          i.payment_amount,
          i.notes,
          i.created_at
        FROM client_ipc i
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
    console.error('[GET /api/finance/ipc]', error);
    return NextResponse.json({ error: 'Failed to fetch IPC records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureClientIpcSchema();
    const body = await request.json();
    const {
      ipc_number,
      project_id,
      ipc_date,
      period_from,
      period_to,
      // Accept both old and new field names
      items_total,
      current_amount,   // legacy alias → items_total
      vat_percentage = 14,
      vat_amount,
      retention_percentage = 10,
      retention_amount,
      advance_deduction_percentage = 0,
      advance_deduction_amount,
      wht_percentage = 1,
      wht_amount,
      previous_payments,
      previous_amount,  // legacy alias → previous_payments
      net_payable,
      net_amount,       // legacy alias → net_payable
      status = 'draft',
      submitted_date,
      notes,
    } = body;

    if (!project_id || !ipc_date) {
      return NextResponse.json({ error: 'project_id and ipc_date are required' }, { status: 400 });
    }

    const resolvedItemsTotal = Number(items_total ?? current_amount ?? 0);
    const resolvedPreviousPayments = Number(previous_payments ?? previous_amount ?? 0);
    
    // Calculate current period work net value
    const currentWorkValue = resolvedItemsTotal > resolvedPreviousPayments 
      ? (resolvedItemsTotal - resolvedPreviousPayments) 
      : resolvedItemsTotal;

    const resolvedVatAmount = vat_amount !== undefined ? Number(vat_amount) : (currentWorkValue * (vat_percentage / 100));
    const resolvedRetentionAmount = retention_amount !== undefined ? Number(retention_amount) : (currentWorkValue * (retention_percentage / 100));
    const resolvedAdvanceAmount = advance_deduction_amount !== undefined ? Number(advance_deduction_amount) : (currentWorkValue * (advance_deduction_percentage / 100));
    const resolvedWhtAmount = wht_amount !== undefined ? Number(wht_amount) : (currentWorkValue * (wht_percentage / 100));

    const resolvedNetPayable = net_payable ?? net_amount ?? (
      currentWorkValue - resolvedAdvanceAmount - resolvedRetentionAmount - resolvedWhtAmount + resolvedVatAmount
    );

    let generatedNumber = ipc_number;
    if (!generatedNumber || generatedNumber.trim() === '') {
      const lastIpc = await query(
        "SELECT ipc_number FROM client_ipc WHERE ipc_number LIKE 'IPC-%' ORDER BY id DESC LIMIT 1"
      );
      let nextNum = 1;
      if (lastIpc.rows.length > 0) {
        const matches = lastIpc.rows[0].ipc_number.match(/\d+/);
        if (matches) {
          const parsed = parseInt(matches[0], 10);
          if (!isNaN(parsed)) {
            nextNum = parsed + 1;
          }
        }
      }
      generatedNumber = `IPC-${String(nextNum).padStart(4, '0')}`;
    }

    const result = await query(
      `INSERT INTO client_ipc (
          ipc_number, project_id, ipc_date, period_from, period_to,
          items_total, vat_percentage, vat_amount, retention_percentage, retention_amount,
          advance_deduction_percentage, advance_deduction_amount, wht_percentage, wht_amount,
          previous_payments, net_payable, status, submitted_date, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        RETURNING *`,
      [
        generatedNumber, project_id, ipc_date,
        period_from ?? null, period_to ?? null,
        resolvedItemsTotal, vat_percentage, resolvedVatAmount,
        retention_percentage, resolvedRetentionAmount,
        advance_deduction_percentage, resolvedAdvanceAmount,
        wht_percentage, resolvedWhtAmount,
        resolvedPreviousPayments, resolvedNetPayable,
        status, submitted_date ?? null, notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/finance/ipc]', error);
    return NextResponse.json({ error: 'Failed to create IPC' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureClientIpcSchema();
    const body = await request.json();
    const {
      id,
      ipc_number,
      project_id,
      ipc_date,
      period_from,
      period_to,
      items_total,
      vat_percentage = 14,
      vat_amount,
      retention_percentage = 10,
      retention_amount,
      advance_deduction_percentage = 0,
      advance_deduction_amount,
      wht_percentage = 1,
      wht_amount,
      previous_payments,
      net_payable,
      status,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const checkRes = await query('SELECT * FROM client_ipc WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'IPC record not found' }, { status: 404 });
    }
    const current = checkRes.rows[0];

    const finalIpcNumber = ipc_number ?? current.ipc_number;
    const finalProjectId = project_id ?? current.project_id;
    const finalIpcDate = ipc_date ?? current.ipc_date;
    const finalPeriodFrom = period_from !== undefined ? period_from : current.period_from;
    const finalPeriodTo = period_to !== undefined ? period_to : current.period_to;
    const finalNotes = notes !== undefined ? notes : current.notes;
    const finalStatus = status ?? current.status;

    const resolvedItemsTotal = items_total !== undefined ? Number(items_total) : Number(current.items_total);
    const resolvedVatPercentage = vat_percentage !== undefined ? Number(vat_percentage) : Number(current.vat_percentage || 14);
    const resolvedRetentionPercentage = retention_percentage !== undefined ? Number(retention_percentage) : Number(current.retention_percentage || 10);
    const resolvedAdvancePercentage = advance_deduction_percentage !== undefined ? Number(advance_deduction_percentage) : Number(current.advance_deduction_percentage || 0);
    const resolvedWhtPercentage = wht_percentage !== undefined ? Number(wht_percentage) : Number(current.wht_percentage || 1);
    const resolvedPreviousPayments = previous_payments !== undefined ? Number(previous_payments) : Number(current.previous_payments);

    const currentWorkValue = resolvedItemsTotal > resolvedPreviousPayments 
      ? (resolvedItemsTotal - resolvedPreviousPayments) 
      : resolvedItemsTotal;

    const resolvedVatAmount = vat_amount !== undefined ? Number(vat_amount) : (currentWorkValue * (resolvedVatPercentage / 100));
    const resolvedRetentionAmount = retention_amount !== undefined ? Number(retention_amount) : (currentWorkValue * (resolvedRetentionPercentage / 100));
    const resolvedAdvanceAmount = advance_deduction_amount !== undefined ? Number(advance_deduction_amount) : (currentWorkValue * (resolvedAdvancePercentage / 100));
    const resolvedWhtAmount = wht_amount !== undefined ? Number(wht_amount) : (currentWorkValue * (resolvedWhtPercentage / 100));

    const resolvedNetPayable = net_payable !== undefined ? Number(net_payable) : (
      currentWorkValue - resolvedAdvanceAmount - resolvedRetentionAmount - resolvedWhtAmount + resolvedVatAmount
    );

    const result = await query(
      `UPDATE client_ipc SET
        ipc_number = $1,
        project_id = $2,
        ipc_date = $3,
        period_from = $4,
        period_to = $5,
        items_total = $6,
        vat_percentage = $7,
        vat_amount = $8,
        retention_percentage = $9,
        retention_amount = $10,
        advance_deduction_percentage = $11,
        advance_deduction_amount = $12,
        wht_percentage = $13,
        wht_amount = $14,
        previous_payments = $15,
        net_payable = $16,
        status = $17,
        notes = $18
      WHERE id = $19
      RETURNING *`,
      [
        finalIpcNumber, finalProjectId, finalIpcDate,
        finalPeriodFrom, finalPeriodTo,
        resolvedItemsTotal, resolvedVatPercentage, resolvedVatAmount,
        resolvedRetentionPercentage, resolvedRetentionAmount,
        resolvedAdvancePercentage, resolvedAdvanceAmount,
        resolvedWhtPercentage, resolvedWhtAmount,
        resolvedPreviousPayments, resolvedNetPayable,
        finalStatus, finalNotes, id
      ]
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[PUT /api/finance/ipc]', error);
    return NextResponse.json({ error: 'Failed to update IPC record' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await query('DELETE FROM client_ipc WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'IPC deleted successfully' });
  } catch (error) {
    const err = error as Error;
    console.error('[DELETE /api/finance/ipc]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

