import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

async function ensureEquipmentAssetsSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS equipment_assets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        contract_id UUID REFERENCES maintenance_contracts(id),
        asset_code TEXT UNIQUE NOT NULL,
        asset_name TEXT NOT NULL,
        category TEXT DEFAULT 'extinguisher' CHECK (category IN ('extinguisher', 'alarm_panel', 'fire_pump', 'sprinkler_valve', 'other')),
        location_details TEXT,
        qr_code_data TEXT,
        last_refill_date DATE,
        next_refill_date DATE,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'needs_refill', 'damaged', 'decommissioned')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS equipment_inspections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        asset_id UUID NOT NULL REFERENCES equipment_assets(id) ON DELETE CASCADE,
        inspection_date DATE DEFAULT CURRENT_DATE,
        inspector_name TEXT,
        action_type TEXT DEFAULT 'inspection' CHECK (action_type IN ('refill', 'inspection', 'repair', 'pressure_test')),
        findings TEXT,
        pressure_status TEXT DEFAULT 'normal' CHECK (pressure_status IN ('normal', 'low', 'high', 'failed')),
        next_due_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error('Failed to ensure equipment_assets schema:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureEquipmentAssetsSchema();
    const { searchParams } = request.nextUrl;
    const contractId = searchParams.get('contract_id') ?? '';
    const category = searchParams.get('category') ?? '';
    const search = searchParams.get('search') ?? '';
    const qrCode = searchParams.get('qr_code') ?? '';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (contractId) { conditions.push(`ea.contract_id = $${paramIndex}`); params.push(contractId); paramIndex++; }
    if (category) { conditions.push(`ea.category = $${paramIndex}`); params.push(category); paramIndex++; }

    if (qrCode) {
      conditions.push(`(ea.asset_code = $${paramIndex} OR ea.qr_code_data = $${paramIndex})`);
      params.push(qrCode);
      paramIndex++;
    } else if (search) {
      conditions.push(`(ea.asset_code ILIKE $${paramIndex} OR ea.asset_name ILIKE $${paramIndex} OR ea.location_details ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataResult = await query(
      `SELECT
          ea.*,
          mc.contract_number,
          mc.client_name,
          mc.site_address,
          (
            SELECT json_agg(ins ORDER BY ins.inspection_date DESC)
            FROM equipment_inspections ins
            WHERE ins.asset_id = ea.id
          ) AS inspection_history
        FROM equipment_assets ea
        LEFT JOIN maintenance_contracts mc ON mc.id = ea.contract_id
        ${where}
        ORDER BY ea.created_at DESC`,
      params
    );

    return NextResponse.json({ data: dataResult.rows });
  } catch (error: any) {
    console.error('[GET /api/maintenance/assets]', error);
    return NextResponse.json({ error: error?.message || 'فشل جلب أصول الطفايات واللوحات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureEquipmentAssetsSchema();
    const body = await request.json();
    const {
      contract_id,
      asset_name,
      category = 'extinguisher',
      location_details,
      last_refill_date,
      next_refill_date,
      status = 'active',
      notes
    } = body;

    if (!asset_name) {
      return NextResponse.json({ error: 'اسم المعدة / الطفاية مطلوب' }, { status: 400 });
    }

    // Generate unique asset code (EQ-1001)
    const lastRes = await query(`SELECT asset_code FROM equipment_assets WHERE asset_code LIKE 'EQ-%' ORDER BY created_at DESC LIMIT 1`);
    let nextNum = 1001;
    if (lastRes.rows.length > 0) {
      const match = lastRes.rows[0].asset_code.match(/\d+/);
      if (match) nextNum = parseInt(match[0], 10) + 1;
    }
    const assetCode = `EQ-${nextNum}`;
    const qrCodeData = assetCode; // QR payload content

    const result = await query(
      `INSERT INTO equipment_assets (
        contract_id, asset_code, asset_name, category, location_details,
        qr_code_data, last_refill_date, next_refill_date, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        contract_id ?? null,
        assetCode,
        asset_name,
        category,
        location_details ?? null,
        qrCodeData,
        last_refill_date ?? null,
        next_refill_date ?? null,
        status,
        notes ?? null
      ]
    );

    return NextResponse.json({ data: result.rows[0], message: `تم تسجيل المعدة وتوليد رمز QR (${assetCode}) بنجاح` }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/maintenance/assets]', error);
    return NextResponse.json({ error: error?.message || 'فشل تسجيل المعدة' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureEquipmentAssetsSchema();
    const body = await request.json();
    const {
      asset_id,
      inspector_name = 'فني الصيانة',
      action_type = 'inspection',
      findings,
      pressure_status = 'normal',
      inspection_date = new Date().toISOString().split('T')[0],
      next_due_date
    } = body;

    if (!asset_id) {
      return NextResponse.json({ error: 'asset_id is required' }, { status: 400 });
    }

    // 1. Insert Inspection Record
    const inspRes = await query(
      `INSERT INTO equipment_inspections (asset_id, inspection_date, inspector_name, action_type, findings, pressure_status, next_due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        asset_id,
        inspection_date,
        inspector_name,
        action_type,
        findings ?? null,
        pressure_status,
        next_due_date ?? null
      ]
    );

    // 2. Update Equipment Asset Refill Dates & Status
    let newStatus = 'active';
    if (pressure_status === 'failed' || pressure_status === 'low') {
      newStatus = 'needs_refill';
    }

    await query(
      `UPDATE equipment_assets
       SET last_refill_date = COALESCE($1, last_refill_date),
           next_refill_date = COALESCE($2, next_refill_date),
           status = $3
       WHERE id = $4`,
      [
        action_type === 'refill' ? inspection_date : null,
        next_due_date ?? null,
        newStatus,
        asset_id
      ]
    );

    return NextResponse.json({
      data: inspRes.rows[0],
      message: `تم تسجيل الفحص والتعبئة الميدانية بنجاح للمعدة.`
    });
  } catch (error: any) {
    console.error('[PUT /api/maintenance/assets]', error);
    return NextResponse.json({ error: error?.message || 'فشل تسجيل الفحص الميداني' }, { status: 500 });
  }
}
