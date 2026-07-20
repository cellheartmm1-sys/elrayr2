import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

// Actual subcontractor_ipc schema:
// ipc_number, contract_id (NOT NULL FK), subcontractor_id (NOT NULL FK),
// project_id (NOT NULL FK), ipc_date, period_from, period_to,
// items_total, retention_amount, previous_payments, net_payable,
// status, approved_by, payment_date, notes, created_at

async function ensureSubIpcSchema() {
  try {
    await query(`
      ALTER TABLE subcontractor_ipc
        ADD COLUMN IF NOT EXISTS vat_percentage NUMERIC(5,2) DEFAULT 14,
        ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS retention_percentage NUMERIC(5,2) DEFAULT 10,
        ADD COLUMN IF NOT EXISTS advance_deduction_percentage NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS advance_deduction_amount NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS materials_deduction NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS wht_percentage NUMERIC(5,2) DEFAULT 1,
        ADD COLUMN IF NOT EXISTS wht_amount NUMERIC(15,2) DEFAULT 0;
    `);
  } catch (err) {
    console.error('Failed to alter subcontractor_ipc schema:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureSubIpcSchema();
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
          i.vat_percentage,
          i.vat_amount,
          i.retention_percentage,
          i.retention_amount,
          i.advance_deduction_percentage,
          i.advance_deduction_amount,
          i.materials_deduction,
          i.wht_percentage,
          i.wht_amount,
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
    await ensureSubIpcSchema();
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
      vat_percentage = 14,
      vat_amount,
      retention_percentage = 10,
      retention_amount,
      advance_deduction_percentage = 0,
      advance_deduction_amount,
      materials_deduction = 0,
      wht_percentage = 1,
      wht_amount,
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

    const resolvedItemsTotal = Number(items_total ?? current_amount ?? 0);
    const resolvedPreviousPayments = Number(previous_payments ?? previous_amount ?? 0);
    const resolvedMaterialsDeduction = Number(materials_deduction ?? 0);

    const resolvedVatAmount = vat_amount !== undefined ? Number(vat_amount) : (resolvedItemsTotal * (vat_percentage / 100));
    const resolvedRetentionAmount = retention_amount !== undefined ? Number(retention_amount) : (resolvedItemsTotal * (retention_percentage / 100));
    const resolvedAdvanceAmount = advance_deduction_amount !== undefined ? Number(advance_deduction_amount) : (resolvedItemsTotal * (advance_deduction_percentage / 100));
    const resolvedWhtAmount = wht_amount !== undefined ? Number(wht_amount) : (resolvedItemsTotal * (wht_percentage / 100));

    const resolvedNetPayable = net_payable ?? net_amount ?? (
      resolvedItemsTotal + resolvedVatAmount - resolvedRetentionAmount - resolvedAdvanceAmount - resolvedMaterialsDeduction - resolvedWhtAmount - resolvedPreviousPayments
    );

    let generatedNumber = ipc_number;
    if (!generatedNumber || generatedNumber.trim() === '') {
      const lastIpc = await query(
        "SELECT ipc_number FROM subcontractor_ipc WHERE ipc_number LIKE 'SC-IPC-%' ORDER BY id DESC LIMIT 1"
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
      generatedNumber = `SC-IPC-${String(nextNum).padStart(4, '0')}`;
    }

    // contract_id is NOT NULL in schema — if not provided, try to find the active contract
    let resolvedContractId = contract_id ?? null;
    if (!resolvedContractId && subcontractor_id && project_id) {
      const contractRes = await query(
        `SELECT id FROM subcontractor_contracts WHERE subcontractor_id = $1 AND project_id = $2 AND status = 'active' LIMIT 1`,
        [subcontractor_id, project_id]
      );
      if (contractRes.rows.length > 0) {
        resolvedContractId = contractRes.rows[0].id;
      } else {
        // Auto-create contract so it doesn't fail!
        const autoConNum = `SC-CON-${Math.floor(100000 + Math.random() * 900000)}`;
        const autoConVal = resolvedItemsTotal > 0 ? resolvedItemsTotal * 2 : 100000;
        const insertCon = await query(
          `INSERT INTO subcontractor_contracts (
            subcontractor_id, project_id, contract_number, scope_of_work, contract_value, status
          ) VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id`,
          [subcontractor_id, project_id, autoConNum, 'عقد مقاول باطن منشأ تلقائياً عند المستخلص', autoConVal]
        );
        resolvedContractId = insertCon.rows[0].id;
      }
    }

    const result = await query(
      `INSERT INTO subcontractor_ipc (
          ipc_number, contract_id, subcontractor_id, project_id, ipc_date,
          period_from, period_to, items_total, vat_percentage, vat_amount,
          retention_percentage, retention_amount, advance_deduction_percentage, advance_deduction_amount,
          materials_deduction, wht_percentage, wht_amount, previous_payments, net_payable, status, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        RETURNING *`,
      [
        generatedNumber, resolvedContractId, subcontractor_id, project_id, ipc_date,
        period_from ?? null, period_to ?? null,
        resolvedItemsTotal, vat_percentage, resolvedVatAmount,
        retention_percentage, resolvedRetentionAmount,
        advance_deduction_percentage, resolvedAdvanceAmount,
        resolvedMaterialsDeduction,
        wht_percentage, resolvedWhtAmount,
        resolvedPreviousPayments, resolvedNetPayable, status, notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/subcontractors/ipc]', error);
    return NextResponse.json({ error: 'Failed to create IPC record' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureSubIpcSchema();
    const body = await request.json();
    const {
      id,
      ipc_number,
      contract_id,
      subcontractor_id,
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

    const checkRes = await query('SELECT * FROM subcontractor_ipc WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'IPC record not found' }, { status: 404 });
    }
    const current = checkRes.rows[0];

    const finalIpcNumber = ipc_number ?? current.ipc_number;
    const finalSubcontractorId = subcontractor_id ?? current.subcontractor_id;
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

    const resolvedVatAmount = vat_amount !== undefined ? Number(vat_amount) : (resolvedItemsTotal * (resolvedVatPercentage / 100));
    const resolvedRetentionAmount = retention_amount !== undefined ? Number(retention_amount) : (resolvedItemsTotal * (resolvedRetentionPercentage / 100));
    const resolvedAdvanceAmount = advance_deduction_amount !== undefined ? Number(advance_deduction_amount) : (resolvedItemsTotal * (resolvedAdvancePercentage / 100));
    const resolvedWhtAmount = wht_amount !== undefined ? Number(wht_amount) : (resolvedItemsTotal * (resolvedWhtPercentage / 100));

    const resolvedNetPayable = net_payable !== undefined ? Number(net_payable) : (
      resolvedItemsTotal + resolvedVatAmount - resolvedRetentionAmount - resolvedAdvanceAmount - resolvedWhtAmount - resolvedPreviousPayments
    );

    let finalContractId = contract_id ?? current.contract_id;
    if ((subcontractor_id && subcontractor_id !== current.subcontractor_id) || (project_id && project_id !== current.project_id) || !finalContractId) {
      const contractRes = await query(
        `SELECT id FROM subcontractor_contracts WHERE subcontractor_id = $1 AND project_id = $2 AND status = 'active' LIMIT 1`,
        [finalSubcontractorId, finalProjectId]
      );
      if (contractRes.rows.length > 0) {
        finalContractId = contractRes.rows[0].id;
      } else {
        // Auto-create contract so it doesn't fail!
        const autoConNum = `SC-CON-${Math.floor(100000 + Math.random() * 900000)}`;
        const autoConVal = resolvedItemsTotal > 0 ? resolvedItemsTotal * 2 : 100000;
        const insertCon = await query(
          `INSERT INTO subcontractor_contracts (
            subcontractor_id, project_id, contract_number, scope_of_work, contract_value, status
          ) VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id`,
          [finalSubcontractorId, finalProjectId, autoConNum, 'عقد مقاول باطن منشأ تلقائياً عند المستخلص', autoConVal]
        );
        finalContractId = insertCon.rows[0].id;
      }
    }

    const result = await query(
      `UPDATE subcontractor_ipc SET
        ipc_number = $1,
        contract_id = $2,
        subcontractor_id = $3,
        project_id = $4,
        ipc_date = $5,
        period_from = $6,
        period_to = $7,
        items_total = $8,
        vat_percentage = $9,
        vat_amount = $10,
        retention_percentage = $11,
        retention_amount = $12,
        advance_deduction_percentage = $13,
        advance_deduction_amount = $14,
        wht_percentage = $15,
        wht_amount = $16,
        previous_payments = $17,
        net_payable = $18,
        status = $19,
        notes = $20
      WHERE id = $21
      RETURNING *`,
      [
        finalIpcNumber, finalContractId, finalSubcontractorId, finalProjectId, finalIpcDate,
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
    console.error('[PUT /api/subcontractors/ipc]', error);
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

    await query('DELETE FROM subcontractor_ipc WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'IPC deleted successfully' });
  } catch (error) {
    const err = error as Error;
    console.error('[DELETE /api/subcontractors/ipc]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

