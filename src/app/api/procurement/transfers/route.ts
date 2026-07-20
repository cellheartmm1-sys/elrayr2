import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

async function ensureWarehouseTransfersSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS warehouse_transfers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        transfer_number TEXT NOT NULL,
        from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        transfer_date DATE DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'completed' CHECK (status IN ('draft','in_transit','completed','cancelled')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        transfer_id UUID NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
        inventory_item_id UUID REFERENCES inventory_items(id),
        item_description TEXT NOT NULL,
        quantity NUMERIC(12,3) NOT NULL,
        unit TEXT,
        unit_cost NUMERIC(12,2) DEFAULT 0
      );
    `);
  } catch (err) {
    console.error('Failed to ensure warehouse_transfers schema:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureWarehouseTransfersSchema();
    const { searchParams } = request.nextUrl;
    const fromId = searchParams.get('from_warehouse_id') ?? '';
    const toId = searchParams.get('to_warehouse_id') ?? '';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (fromId) { conditions.push(`wt.from_warehouse_id = $${paramIndex}`); params.push(fromId); paramIndex++; }
    if (toId) { conditions.push(`wt.to_warehouse_id = $${paramIndex}`); params.push(toId); paramIndex++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT
          wt.*,
          w1.name AS from_warehouse_name,
          w2.name AS to_warehouse_name,
          (SELECT COUNT(*) FROM warehouse_transfer_items wti WHERE wti.transfer_id = wt.id) AS items_count
        FROM warehouse_transfers wt
        LEFT JOIN warehouses w1 ON w1.id = wt.from_warehouse_id
        LEFT JOIN warehouses w2 ON w2.id = wt.to_warehouse_id
        ${where}
        ORDER BY wt.transfer_date DESC, wt.created_at DESC`,
      params
    );

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('[GET /api/procurement/transfers]', error);
    return NextResponse.json({ error: error?.message || 'فشل جلب أمن تحويلات المخازن' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureWarehouseTransfersSchema();
    const body = await request.json();
    const {
      from_warehouse_id,
      to_warehouse_id,
      transfer_date = new Date().toISOString().split('T')[0],
      notes,
      items = []
    } = body;

    if (!from_warehouse_id || !to_warehouse_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'إجبارياً: يجب اختيار المخزن المصدر والمستهدف وإضافة صنف تحويل واحد على الأقل' }, { status: 400 });
    }

    if (from_warehouse_id === to_warehouse_id) {
      return NextResponse.json({ error: 'لا يمكن التحويل لنفس المخزن' }, { status: 400 });
    }

    // Generate Transfer Number (TRF-0001)
    const lastRes = await query(`SELECT transfer_number FROM warehouse_transfers WHERE transfer_number LIKE 'TRF-%' ORDER BY created_at DESC LIMIT 1`);
    let nextNum = 1;
    if (lastRes.rows.length > 0) {
      const match = lastRes.rows[0].transfer_number.match(/\d+/);
      if (match) nextNum = parseInt(match[0], 10) + 1;
    }
    const transferNumber = `TRF-${String(nextNum).padStart(4, '0')}`;

    // Process Stock Transfer
    for (const item of items) {
      const itemQty = Number(item.quantity || 0);
      const itemDesc = item.item_description || 'صنف خامات/عَدَد';
      const itemUnit = item.unit || 'وحدة';
      const itemCost = Number(item.unit_cost || 0);

      // 1. Deduct quantity from source warehouse
      if (item.inventory_item_id) {
        await query(
          `UPDATE inventory_items 
           SET current_quantity = GREATEST(0, current_quantity - $1)
           WHERE id = $2`,
          [itemQty, item.inventory_item_id]
        );
      }

      // 2. Add or create quantity in target warehouse
      const targetCheck = await query(
        `SELECT id FROM inventory_items WHERE warehouse_id = $1 AND TRIM(LOWER(description)) = TRIM(LOWER($2)) LIMIT 1`,
        [to_warehouse_id, itemDesc]
      );

      if (targetCheck.rows.length > 0) {
        await query(
          `UPDATE inventory_items 
           SET current_quantity = current_quantity + $1
           WHERE id = $2`,
          [itemQty, targetCheck.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO inventory_items (warehouse_id, description, unit, current_quantity, min_quantity, unit_cost)
           VALUES ($1, $2, $3, $4, 5, $5)`,
          [to_warehouse_id, itemDesc, itemUnit, itemQty, itemCost]
        );
      }
    }

    // Insert Transfer Order Master
    const transferRes = await query(
      `INSERT INTO warehouse_transfers (transfer_number, from_warehouse_id, to_warehouse_id, transfer_date, status, notes)
       VALUES ($1, $2, $3, $4, 'completed', $5)
       RETURNING *`,
      [transferNumber, from_warehouse_id, to_warehouse_id, transfer_date, notes ?? null]
    );

    const transferId = transferRes.rows[0].id;

    // Insert Transfer Order Items
    for (const item of items) {
      const itemQty = Number(item.quantity || 0);
      const itemCost = Number(item.unit_cost || 0);

      await query(
        `INSERT INTO warehouse_transfer_items (transfer_id, inventory_item_id, item_description, quantity, unit, unit_cost)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          transferId,
          item.inventory_item_id ?? null,
          item.item_description || 'صنف تحويل',
          itemQty,
          item.unit || 'وحدة',
          itemCost
        ]
      );
    }

    return NextResponse.json({
      data: transferRes.rows[0],
      message: `تم تنفيذ أمر تحويل الخامات والعَدَد (#${transferNumber}) وتحديث أرصدة المخازن بنجاح.`
    }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/procurement/transfers]', error);
    return NextResponse.json({ error: error?.message || 'فشل تنفيذ أمر تحويل الخامات' }, { status: 500 });
  }
}
