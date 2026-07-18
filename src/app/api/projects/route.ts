import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  let sql = `
    SELECT p.*,
      u1.full_name as manager_name,
      u2.full_name as engineer_name,
      COALESCE(AVG(pp.actual_percentage), 0) as actual_progress,
      COALESCE(AVG(pp.planned_percentage), 0) as planned_progress,
      COALESCE(SUM(pe.amount), 0) as total_expenses,
      COUNT(DISTINCT ph.id) as phases_count
    FROM projects p
    LEFT JOIN users u1 ON u1.id = p.project_manager_id
    LEFT JOIN users u2 ON u2.id = p.site_engineer_id
    LEFT JOIN project_progress pp ON pp.project_id = p.id
    LEFT JOIN project_expenses pe ON pe.project_id = p.id
    LEFT JOIN project_phases ph ON ph.project_id = p.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIdx = 1;

  if (status && status !== 'all') {
    sql += ` AND p.status = $${paramIdx++}`;
    params.push(status);
  }

  if (search) {
    sql += ` AND (p.name ILIKE $${paramIdx} OR p.code ILIKE $${paramIdx} OR p.client_name ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  sql += ` GROUP BY p.id, u1.full_name, u2.full_name ORDER BY p.created_at DESC`;

  const result = await query(sql, params);
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, client_name, client_contact, location, start_date, end_date, contract_value, status, description } = body;

    const result = await query(
      `INSERT INTO projects (name, code, client_name, client_contact, location, start_date, end_date, contract_value, status, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        name,
        code,
        client_name,
        client_contact || null,
        location || null,
        start_date || null,
        end_date || null,
        contract_value ? Number(contract_value) : null,
        status || 'active',
        description || null
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
