import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let sql = 'SELECT * FROM users WHERE is_active = true';
    const params: unknown[] = [];

    if (role && role !== 'all') {
      sql += ' AND role = $1';
      params.push(role);
    }

    sql += ' ORDER BY created_at DESC';

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
    const { full_name, email, role, phone } = body;

    const result = await query(`
      INSERT INTO users (full_name, email, role, phone, is_active)
      VALUES ($1, $2, $3, $4, true) RETURNING *
    `, [full_name, email, role, phone]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
