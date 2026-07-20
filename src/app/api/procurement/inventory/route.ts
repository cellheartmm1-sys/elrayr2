import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const warehouse_id = searchParams.get('warehouse_id');
  const low_stock = searchParams.get('low_stock');

  try {
    let sql = `
      SELECT ii.*, w.name as warehouse_name, ic.name_ar, ic.name_en, ic.category
      FROM inventory_items ii
      JOIN warehouses w ON w.id = ii.warehouse_id
      LEFT JOIN items_catalog ic ON ic.id = ii.item_catalog_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (warehouse_id) {
      sql += ` AND ii.warehouse_id = $${paramIdx++}`;
      params.push(warehouse_id);
    }

    if (low_stock === 'true') {
      sql += ` AND ii.current_quantity <= ii.min_quantity`;
    }

    sql += ` ORDER BY ii.description ASC`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { warehouse_id, item_catalog_id, description, unit, current_quantity, min_quantity, unit_cost, location_in_warehouse, sale_price } = body;

    // Ensure sale_price column exists in inventory_items table
    await query(`
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12,2) DEFAULT 0;
    `);

    const result = await query(`
      INSERT INTO inventory_items (warehouse_id, item_catalog_id, description, unit, current_quantity, min_quantity, unit_cost, location_in_warehouse, sale_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [
      warehouse_id,
      item_catalog_id || null,
      description,
      unit,
      current_quantity || 0,
      min_quantity || 0,
      unit_cost || 0,
      location_in_warehouse || null,
      sale_price || 0
    ]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, warehouse_id, item_catalog_id, description, unit, current_quantity, min_quantity, unit_cost, location_in_warehouse, sale_price } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Ensure sale_price column exists in inventory_items table
    await query(`
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12,2) DEFAULT 0;
    `);

    const result = await query(`
      UPDATE inventory_items SET
        warehouse_id = $1,
        item_catalog_id = $2,
        description = $3,
        unit = $4,
        current_quantity = $5,
        min_quantity = $6,
        unit_cost = $7,
        location_in_warehouse = $8,
        sale_price = $9
      WHERE id = $10 RETURNING *
    `, [
      warehouse_id,
      item_catalog_id || null,
      description,
      unit,
      current_quantity || 0,
      min_quantity || 0,
      unit_cost || 0,
      location_in_warehouse || null,
      sale_price || 0,
      id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await query('DELETE FROM inventory_items WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Item deleted successfully' });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
