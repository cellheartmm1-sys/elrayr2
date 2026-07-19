import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('project_id') ?? '';

    let sql = `
      SELECT w.id, w.name, w.location, w.project_id, w.is_active, p.name as project_name
      FROM warehouses w
      LEFT JOIN projects p ON p.id = w.project_id
      WHERE w.is_active = TRUE
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (projectId) {
      sql += ` AND w.project_id = $${paramIdx++}`;
      params.push(projectId);
    }

    sql += ` ORDER BY w.name ASC`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('[GET /api/warehouses]', error);
    return NextResponse.json({ error: 'Failed to fetch warehouses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, project_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO warehouses (name, location, project_id) VALUES ($1,$2,$3) RETURNING *`,
      [name, location ?? null, project_id ?? null]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/warehouses]', error);
    return NextResponse.json({ error: 'Failed to create warehouse' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, location, project_id } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }

    const result = await query(
      `UPDATE warehouses SET 
        name = $1, 
        location = $2, 
        project_id = $3
      WHERE id = $4 RETURNING *`,
      [name, location ?? null, project_id ?? null, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[PUT /api/warehouses]', error);
    return NextResponse.json({ error: 'Failed to update warehouse' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Soft-delete warehouse
    const result = await query(
      `UPDATE warehouses SET is_active = FALSE WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/warehouses]', error);
    return NextResponse.json({ error: 'Failed to delete warehouse' }, { status: 500 });
  }
}
