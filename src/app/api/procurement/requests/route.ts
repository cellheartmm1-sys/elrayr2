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
          p.project_number,
          mr.requested_by,
          u.full_name AS requested_by_name,
          mr.request_date,
          mr.required_date,
          mr.priority,
          mr.status,
          mr.total_items,
          mr.total_estimated_cost,
          mr.approved_by,
          approver.full_name AS approver_name,
          mr.approval_date,
          mr.notes,
          mr.created_at,
          mr.updated_at
        FROM material_requests mr
        LEFT JOIN projects p ON p.id = mr.project_id
        LEFT JOIN employees u ON u.id = mr.requested_by
        LEFT JOIN employees approver ON approver.id = mr.approved_by
        ${where}
        ORDER BY
          CASE mr.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
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
      requested_by,
      request_date,
      required_date,
      priority = 'medium',
      items,
      notes,
    } = body;

    if (!requested_by || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'requested_by and at least one item are required' },
        { status: 400 }
      );
    }

    const totalItems = items.length;
    const totalEstimatedCost = items.reduce(
      (sum: number, item: { estimated_unit_cost?: number; quantity?: number }) =>
        sum + (item.estimated_unit_cost ?? 0) * (item.quantity ?? 1),
      0
    );

    const result = await query(
      `INSERT INTO material_requests (
          request_number, project_id, requested_by, request_date, required_date,
          priority, status, total_items, total_estimated_cost, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9)
        RETURNING *`,
      [
        request_number ?? null,
        project_id ?? null,
        requested_by,
        request_date ?? new Date().toISOString().split('T')[0],
        required_date ?? null,
        priority,
        totalItems,
        totalEstimatedCost,
        notes ?? null,
      ]
    );

    const requestId = result.rows[0].id;

    // Insert line items if table exists
    if (items.length > 0) {
      const itemValues = items.map(
        (_: unknown, i: number) =>
          `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
      );
      const itemParams = items.flatMap(
        (item: {
          item_name?: string;
          item_code?: string;
          quantity?: number;
          unit?: string;
          estimated_unit_cost?: number;
          notes?: string;
        }) => [
          requestId,
          item.item_name ?? null,
          item.item_code ?? null,
          item.quantity ?? 1,
          item.unit ?? null,
          item.estimated_unit_cost ?? null,
        ]
      );

      await query(
        `INSERT INTO material_request_items (request_id, item_name, item_code, quantity, unit, estimated_unit_cost)
          VALUES ${itemValues.join(', ')}`,
        itemParams
      );
    }

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/procurement/requests]', error);
    return NextResponse.json(
      { error: 'Failed to create material request' },
      { status: 500 }
    );
  }
}
