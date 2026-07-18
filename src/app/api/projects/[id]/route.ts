import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [project, phases, progress, expenses, ipcs, subIpcs, debts] = await Promise.all([
    query(`
      SELECT p.*, u1.full_name as manager_name, u2.full_name as engineer_name
      FROM projects p
      LEFT JOIN users u1 ON u1.id = p.project_manager_id
      LEFT JOIN users u2 ON u2.id = p.site_engineer_id
      WHERE p.id = $1
    `, [id]),
    query(`SELECT * FROM project_phases WHERE project_id = $1 ORDER BY order_index`, [id]),
    query(`SELECT * FROM project_progress WHERE project_id = $1 ORDER BY report_date DESC LIMIT 10`, [id]),
    query(`SELECT category, SUM(amount) as total FROM project_expenses WHERE project_id = $1 GROUP BY category`, [id]),
    query(`SELECT * FROM client_ipc WHERE project_id = $1 ORDER BY ipc_date DESC`, [id]),
    query(`
      SELECT si.*, s.name as subcontractor_name, sc.scope_of_work
      FROM subcontractor_ipc si
      JOIN subcontractors s ON s.id = si.subcontractor_id
      JOIN subcontractor_contracts sc ON sc.id = si.contract_id
      WHERE si.project_id = $1
      ORDER BY si.ipc_date DESC
    `, [id]),
    query(`SELECT * FROM company_debts WHERE project_id = $1 ORDER BY created_at DESC`, [id]),
  ]);

  if (!project.rows[0]) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({
    project: project.rows[0],
    phases: phases.rows,
    progress: progress.rows,
    expenses: expenses.rows,
    ipcs: ipcs.rows,
    subIpcs: subIpcs.rows,
    debts: debts.rows,
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, client_name, client_contact, location, start_date, end_date, contract_value, status, description } = body;

    const result = await query(
      `UPDATE projects SET name=$1, client_name=$2, client_contact=$3, location=$4, start_date=$5, end_date=$6, 
       contract_value=$7, status=$8, description=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, client_name, client_contact, location, start_date, end_date, contract_value, status, description, id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await query(`DELETE FROM projects WHERE id = $1`, [id]);
  return NextResponse.json({ success: true });
}
