import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

async function ensureMaterialIssuesSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS material_issues (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        issue_number TEXT NOT NULL,
        project_id UUID NOT NULL REFERENCES projects(id),
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        issue_date DATE DEFAULT CURRENT_DATE,
        total_cost NUMERIC(15,2) DEFAULT 0,
        boq_warning BOOLEAN DEFAULT FALSE,
        warning_message TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS material_issue_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        issue_id UUID NOT NULL REFERENCES material_issues(id) ON DELETE CASCADE,
        inventory_item_id UUID REFERENCES inventory_items(id),
        boq_item_id UUID REFERENCES boq_items(id),
        item_description TEXT NOT NULL,
        quantity NUMERIC(12,3) NOT NULL,
        unit TEXT,
        unit_cost NUMERIC(12,2) DEFAULT 0,
        total_cost NUMERIC(15,2) DEFAULT 0
      );
    `);
  } catch (err) {
    console.error('Failed to ensure material_issues schema:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureMaterialIssuesSchema();
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('project_id') ?? '';
    const warehouseId = searchParams.get('warehouse_id') ?? '';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (projectId) { conditions.push(`mi.project_id = $${paramIndex}`); params.push(projectId); paramIndex++; }
    if (warehouseId) { conditions.push(`mi.warehouse_id = $${paramIndex}`); params.push(warehouseId); paramIndex++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT
          mi.*,
          p.name AS project_name,
          w.name AS warehouse_name,
          (SELECT COUNT(*) FROM material_issue_items mii WHERE mii.issue_id = mi.id) AS items_count
        FROM material_issues mi
        LEFT JOIN projects p ON p.id = mi.project_id
        LEFT JOIN warehouses w ON w.id = mi.warehouse_id
        ${where}
        ORDER BY mi.issue_date DESC, mi.created_at DESC`,
      params
    );

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('[GET /api/procurement/material-issues]', error);
    return NextResponse.json({ error: error?.message || 'فشل جلب إذون صرف الخامات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureMaterialIssuesSchema();
    const body = await request.json();
    const {
      project_id,
      warehouse_id,
      issue_date = new Date().toISOString().split('T')[0],
      notes,
      items = []
    } = body;

    if (!project_id || !warehouse_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'إجبارياً: يجب اختيار المشروع والمخزن وإضافة صنف واحد على الأقل' }, { status: 400 });
    }

    // Generate Issue Number (MIS-0001)
    const lastRes = await query(`SELECT issue_number FROM material_issues WHERE issue_number LIKE 'MIS-%' ORDER BY created_at DESC LIMIT 1`);
    let nextNum = 1;
    if (lastRes.rows.length > 0) {
      const match = lastRes.rows[0].issue_number.match(/\d+/);
      if (match) nextNum = parseInt(match[0], 10) + 1;
    }
    const issueNumber = `MIS-${String(nextNum).padStart(4, '0')}`;

    let totalIssueCost = 0;
    let hasBoqWarning = false;
    const warningMessages: string[] = [];

    // Check BOQ quantity limits and deduct inventory stock
    for (const item of items) {
      const itemQty = Number(item.quantity || 0);
      const itemCost = Number(item.unit_cost || 0);
      const lineCost = itemQty * itemCost;
      totalIssueCost += lineCost;

      // 1. Deduct quantity from warehouse inventory
      if (item.inventory_item_id) {
        await query(
          `UPDATE inventory_items 
           SET current_quantity = GREATEST(0, current_quantity - $1)
           WHERE id = $2`,
          [itemQty, item.inventory_item_id]
        );
      }

      // 2. Check BOQ limit warning
      if (item.boq_item_id) {
        const boqRes = await query(`SELECT description, quantity FROM boq_items WHERE id = $1`, [item.boq_item_id]);
        if (boqRes.rows.length > 0) {
          const boqLimit = Number(boqRes.rows[0].quantity || 0);
          const issuedRes = await query(
            `SELECT SUM(quantity) as total_issued FROM material_issue_items WHERE boq_item_id = $1`,
            [item.boq_item_id]
          );
          const prevIssued = Number(issuedRes.rows[0]?.total_issued || 0);
          const totalAfter = prevIssued + itemQty;

          if (totalAfter > boqLimit) {
            hasBoqWarning = true;
            warningMessages.push(`تنبيه: الصنف "${boqRes.rows[0].description}" تجاوز الكمية المحددة بالربط في المقايسة المعتمدة (المخطط: ${boqLimit} ، المسحوب: ${totalAfter})`);
          }
        }
      }
    }

    // Insert main issue record
    const issueRes = await query(
      `INSERT INTO material_issues (issue_number, project_id, warehouse_id, issue_date, total_cost, boq_warning, warning_message, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        issueNumber, project_id, warehouse_id, issue_date, totalIssueCost,
        hasBoqWarning, warningMessages.join(' | '), notes ?? null
      ]
    );

    const issueId = issueRes.rows[0].id;

    // Insert issue line items
    for (const item of items) {
      const itemQty = Number(item.quantity || 0);
      const itemCost = Number(item.unit_cost || 0);
      const lineCost = itemQty * itemCost;

      await query(
        `INSERT INTO material_issue_items (issue_id, inventory_item_id, boq_item_id, item_description, quantity, unit, unit_cost, total_cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          issueId,
          item.inventory_item_id ?? null,
          item.boq_item_id ?? null,
          item.item_description || 'صنف خامات',
          itemQty,
          item.unit || 'وحدة',
          itemCost,
          lineCost
        ]
      );
    }

    // Auto-post Direct Material Cost to project_expenses
    if (totalIssueCost > 0) {
      const projRes = await query(`SELECT name FROM projects WHERE id = $1`, [project_id]);
      const projName = projRes.rows[0]?.name || 'المشروع';

      await query(
        `INSERT INTO project_expenses (project_id, expense_date, category, description, amount, supplier)
         VALUES ($1, $2, 'material', $3, $4, 'صرف خامات من المخزن')`,
        [
          project_id,
          issue_date,
          `تكلفة خامات مباشرة (Direct Material Cost) - إذن صرف #${issueNumber} لموقع ${projName}`,
          totalIssueCost
        ]
      );
    }

    return NextResponse.json({
      data: issueRes.rows[0],
      message: hasBoqWarning 
        ? `تم إصدار إذن الصرف وقيد التكلفة بنجاح مع وجود تنبيه لتجاوز مقايسة المشروع!` 
        : `تم إصدار إذن صرف الخامات وقيد التكلفة المباشرة على ميزانية المشروع بنجاح.`
    }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/procurement/material-issues]', error);
    return NextResponse.json({ error: error?.message || 'فشل إصدار إذن صرف الخامات' }, { status: 500 });
  }
}
