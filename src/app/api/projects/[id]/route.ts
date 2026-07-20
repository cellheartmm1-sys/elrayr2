import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { createApprovalRequest } from '@/lib/approvals';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Ensure weight_percentage column exists
  await query(`
    ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS weight_percentage NUMERIC(5,2) DEFAULT 0;
  `);

  const [project, phases, progress, expenses, ipcs, subIpcs, documents, laborAttendance, projectEmployees] = await Promise.all([
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
      SELECT a.*, e.base_salary, e.full_name as employee_name, e.job_title
      FROM attendance_records a
      JOIN employees e ON e.id = a.employee_id
      WHERE a.project_id = $1
    `, [id]),
    query(`
      SELECT id, employee_number, full_name, job_title, employment_type, base_salary, phone, status
      FROM employees
      WHERE project_id = $1
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
    projectEmployees: projectEmployees.rows,
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, code, client_name, client_contact, location, start_date, end_date, contract_value, status, description, payment_type } = body;

    // Ensure payment_type column exists in projects table
    await query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'once';
    `);

    const result = await query(
      `UPDATE projects SET name=$1, code=COALESCE($2, code), client_name=$3, client_contact=$4, location=$5, start_date=$6, end_date=$7, 
       contract_value=$8, status=$9, description=$10, payment_type=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [name, code, client_name, client_contact, location, start_date, end_date, contract_value, status, description, payment_type || 'once', id]
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
