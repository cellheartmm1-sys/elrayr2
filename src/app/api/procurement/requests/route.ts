import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? '';
    const priority = searchParams.get('priority') ?? '';
    const projectId = searchParams.get('project_id') ?? '';
    const requestedBy = searchParams.get('requested_by') ?? '';
    const dateFrom = searchParams.get('date_from') ?? '';
    const dateTo = searchParams.get('date_to') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`mr.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      conditions.push(`mr.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    if (projectId) {
      conditions.push(`mr.project_id = $${paramIndex}`);
      params.push(projectId);
      paramIndex++;
    }

    if (requestedBy) {
      conditions.push(`mr.requested_by = $${paramIndex}`);
      params.push(requestedBy);
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`mr.request_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`mr.request_date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM material_requests mr ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          mr.id,
          mr.request_number,
          mr.project_id,
          p.name AS project_name,
          mr.warehouse_id,
          w.name AS warehouse_name,
          mr.requested_by,
          e.full_name AS requested_by_name,
          mr.request_date,
          mr.required_date,
          mr.priority,
          mr.status,
          mr.approved_by,
          approver.full_name AS approver_name,
          mr.approval_date,
          mr.notes,
          mr.created_at,
          (SELECT COUNT(*) FROM material_request_items mri WHERE mri.request_id = mr.id) AS total_items,
          (SELECT COALESCE(SUM(mri.unit_cost * mri.requested_quantity),0) FROM material_request_items mri WHERE mri.request_id = mr.id) AS total_estimated_cost
        FROM material_requests mr
        LEFT JOIN projects p ON p.id = mr.project_id
        LEFT JOIN warehouses w ON w.id = mr.warehouse_id
        LEFT JOIN employees e ON e.id = mr.requested_by
        LEFT JOIN employees approver ON approver.id = mr.approved_by
        ${where}
        ORDER BY
          CASE mr.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            ELSE 4
          END,
          mr.request_date DESC
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
    console.error('[GET /api/procurement/requests]', error);
    return NextResponse.json(
      { error: 'Failed to fetch material requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      request_number,
      project_id,
      warehouse_id,
      requested_by,
      request_date,
      required_date,
      priority = 'normal',
      items,
      notes,
    } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    if (!requested_by) {
      return NextResponse.json({ error: 'requested_by is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    const validItems = items.filter((item: { item_name?: string; description?: string }) =>
      (item.item_name || item.description || '').trim() !== ''
    );

    if (validItems.length === 0) {
      return NextResponse.json({ error: 'At least one item with a name is required' }, { status: 400 });
    }

    const generatedNumber = request_number || `REQ-${Math.floor(100000 + Math.random() * 900000)}`;

    const result = await query(
      `INSERT INTO material_requests (
          request_number, project_id, warehouse_id, requested_by, request_date, required_date,
          priority, status, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)
        RETURNING *`,
      [
        generatedNumber,
        project_id,
        warehouse_id ?? null,
        requested_by,
        request_date ?? new Date().toISOString().split('T')[0],
        required_date ?? null,
        priority,
        notes ?? null,
      ]
    );

    const requestId = result.rows[0].id;

    // Insert line items matching actual schema columns
    const itemValues = validItems.map(
      (_: unknown, i: number) =>
        `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
    );
    const itemParams = validItems.flatMap(
      (item: {
        item_name?: string;
        description?: string;
        quantity?: number;
        unit?: string;
        estimated_unit_cost?: number;
        unit_cost?: number;
      }) => [
        requestId,
        item.description || item.item_name || '',
        item.unit ?? 'قطعة',
        item.quantity ?? 1,
      ]
    );

    await query(
      `INSERT INTO material_request_items (request_id, description, unit, requested_quantity)
        VALUES ${itemValues.join(', ')}`,
      itemParams
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/procurement/requests]', error);
    return NextResponse.json(
      { error: 'Failed to create material request' },
      { status: 500 }
    );
  }
}
