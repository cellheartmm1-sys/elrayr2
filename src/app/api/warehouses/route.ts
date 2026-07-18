import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('project_id') ?? '';

    let sql = `SELECT id, name, location, project_id, is_active FROM warehouses WHERE is_active = TRUE`;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (projectId) {
      sql += ` AND project_id = $${paramIdx++}`;
      params.push(projectId);
    }

    sql += ` ORDER BY name ASC`;

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
