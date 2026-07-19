import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const estimationRes = await query(`
      SELECT e.*, p.name as project_name, p.code as project_code
      FROM estimations e
      LEFT JOIN projects p ON p.id = e.project_id
      WHERE e.id = $1
    `, [id]);

    if (!estimationRes.rows[0]) {
      return NextResponse.json({ error: 'Estimation not found' }, { status: 404 });
    }

    const itemsRes = await query(`
      SELECT b.*, ic.name_ar, ic.name_en
      FROM boq_items b
      LEFT JOIN items_catalog ic ON ic.id = b.item_catalog_id
      WHERE b.estimation_id = $1
      ORDER BY b.order_index ASC, b.created_at ASC
    `, [id]);

    const documentsRes = await query(`
      SELECT * FROM estimation_documents
      WHERE estimation_id = $1
      ORDER BY uploaded_at DESC
    `, [id]);

    return NextResponse.json({
      estimation: estimationRes.rows[0],
      items: itemsRes.rows,
      documents: documentsRes.rows,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const {
      tender_name, tender_number, client_name, submission_date, status,
      overhead_percentage, profit_percentage, notes, total_material_cost,
      total_labor_cost, total_price, items
    } = body;

    // Begin Transaction manually if using raw client, but here we can do it in separate queries
    await query(`
      UPDATE estimations SET
        tender_name = $1, tender_number = $2, client_name = $3, submission_date = $4,
        status = $5, overhead_percentage = $6, profit_percentage = $7, notes = $8,
        total_material_cost = $9, total_labor_cost = $10, total_price = $11, updated_at = NOW()
      WHERE id = $12
    `, [
      tender_name, tender_number, client_name, submission_date, status,
      overhead_percentage, profit_percentage, notes, total_material_cost || 0,
      total_labor_cost || 0, total_price || 0, id
    ]);

    // If items are provided, sync them (delete old and insert new, or update)
    if (items && Array.isArray(items)) {
      await query(`DELETE FROM boq_items WHERE estimation_id = $1`, [id]);
      for (const item of items) {
        await query(`
          INSERT INTO boq_items (estimation_id, item_catalog_id, description, unit, quantity, material_unit_cost, labor_unit_cost, section, order_index)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          id, item.item_catalog_id || null, item.description, item.unit,
          item.quantity || 0, item.material_unit_cost || 0, item.labor_unit_cost || 0,
          item.section || '', item.order_index || 0
        ]);
      }
    }

    // Sync documents if provided
    if (body.uploaded_files && Array.isArray(body.uploaded_files)) {
      await query(`DELETE FROM estimation_documents WHERE estimation_id = $1`, [id]);
      for (const file of body.uploaded_files) {
        await query(
          `INSERT INTO estimation_documents (estimation_id, document_name, file_url)
           VALUES ($1, $2, $3)`,
          [id, file.name, file.key]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await query(`DELETE FROM estimations WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
