import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    let sql = `
      SELECT e.*, p.name as project_name, p.code as project_code
      FROM estimations e
      LEFT JOIN projects p ON p.id = e.project_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (status && status !== 'all') {
      sql += ` AND e.status = $${paramIdx++}`;
      params.push(status);
    }

    sql += ` ORDER BY e.submission_date DESC, e.created_at DESC`;

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
    const { project_id, tender_name, tender_number, client_name, submission_date, status, overhead_percentage, profit_percentage } = body;

    const result = await query(`
      INSERT INTO estimations (project_id, tender_name, tender_number, client_name, submission_date, status, overhead_percentage, profit_percentage)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [
      project_id || null, 
      tender_name, 
      tender_number || null, 
      client_name, 
      submission_date || null, 
      status || 'draft', 
      overhead_percentage === '' ? 15 : Number(overhead_percentage), 
      profit_percentage === '' ? 10 : Number(profit_percentage)
    ]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
