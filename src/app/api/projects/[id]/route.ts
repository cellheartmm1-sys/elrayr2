import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { createApprovalRequest } from '@/lib/approvals';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Ensure weight_percentage column exists
  await query(`
    ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS weight_percentage NUMERIC(5,2) DEFAULT 0;
  `);

  const [project, phases, progress, expenses, ipcs, subIpcs, documents, laborAttendance] = await Promise.all([
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
    query(`SELECT * FROM project_documents WHERE project_id = $1 ORDER BY uploaded_at DESC`, [id]),
    query(`
      SELECT a.*, e.base_salary, e.full_name as employee_name
      FROM attendance_records a
      JOIN employees e ON e.id = a.employee_id
      WHERE a.project_id = $1
    `, [id]),
  ]);

  if (!project.rows[0]) {
    return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 });
  }

  return NextResponse.json({
    project: project.rows[0],
    phases: phases.rows,
    progress: progress.rows,
    expenses: expenses.rows,
    ipcs: ipcs.rows,
    subIpcs: subIpcs.rows,
    documents: documents.rows,
    laborAttendance: laborAttendance.rows,
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
  try {
    const { id } = await params;

    const userRole = request.headers.get('x-user-role') || 'admin';
    const rawUserName = request.headers.get('x-user-name') || 'مستخدم النظام';
    let userName = 'مستخدم النظام';
    try {
      userName = decodeURIComponent(rawUserName);
    } catch {
      userName = rawUserName;
    }
    const requireApproval = request.headers.get('x-require-approval') === 'true' || userRole === 'secondary';


    // Fetch project title for approval/alert
    const projRes = await query('SELECT id, name FROM projects WHERE id = $1', [id]);
    const proj = projRes.rows[0];

    if (!proj) {
      return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 });
    }

    if (requireApproval) {
      const approval = await createApprovalRequest(
        userName,
        userRole,
        'projects',
        'DELETE',
        'project',
        `طلب حذف مشروع: ${proj.name}`,
        { id, name: proj.name }
      );
      return NextResponse.json({
        pending_approval: true,
        message: 'تم إرسال طلب حذف المشروع إلى مدير النظام للموافقة عليه أولاً.',
        data: approval
      }, { status: 202 });
    }

    // Clean up dependent records safely before deleting project
    await query(`DELETE FROM project_progress WHERE project_id = $1`, [id]);
    await query(`DELETE FROM project_phases WHERE project_id = $1`, [id]);
    await query(`DELETE FROM project_expenses WHERE project_id = $1`, [id]);
    await query(`DELETE FROM labor_attendance WHERE project_id = $1`, [id]);
    await query(`DELETE FROM subcontractor_ipc WHERE project_id = $1`, [id]);
    await query(`DELETE FROM subcontractor_contracts WHERE project_id = $1`, [id]);
    await query(`DELETE FROM client_ipc WHERE project_id = $1`, [id]);
    await query(`UPDATE material_requests SET project_id = NULL WHERE project_id = $1`, [id]);
    await query(`UPDATE warehouses SET project_id = NULL WHERE project_id = $1`, [id]);
    await query(`UPDATE estimations SET project_id = NULL WHERE project_id = $1`, [id]);
    await query(`UPDATE maintenance_contracts SET project_id = NULL WHERE project_id = $1`, [id]);

    await query(`DELETE FROM projects WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: 'تم حذف المشروع بنجاح' });
  } catch (error: any) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: error.message || 'فشلت عملية الحذف' }, { status: 500 });
  }
}
