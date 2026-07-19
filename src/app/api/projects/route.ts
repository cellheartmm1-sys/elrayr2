import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { createApprovalRequest } from '@/lib/approvals';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Ensure project_documents table exists
    await query(`
      CREATE TABLE IF NOT EXISTS project_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        document_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ensure project_phases table has weight_percentage column
    await query(`
      ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS weight_percentage NUMERIC(5,2) DEFAULT 0;
    `);

    let sql = `
      SELECT p.*,
        u1.full_name as manager_name,
        u2.full_name as engineer_name,
        COALESCE(
          (SELECT SUM(ph.actual_progress * ph.weight_percentage) / NULLIF(SUM(ph.weight_percentage), 0) FROM project_phases ph WHERE ph.project_id = p.id),
          (SELECT AVG(ph.actual_progress) FROM project_phases ph WHERE ph.project_id = p.id),
          0
        ) as actual_progress,
        COALESCE(
          (SELECT SUM(ph.planned_progress * ph.weight_percentage) / NULLIF(SUM(ph.weight_percentage), 0) FROM project_phases ph WHERE ph.project_id = p.id),
          (SELECT AVG(ph.planned_progress) FROM project_phases ph WHERE ph.project_id = p.id),
          0
        ) as planned_progress,
        COALESCE((SELECT SUM(pe.amount) FROM project_expenses pe WHERE pe.project_id = p.id), 0) as total_expenses,
        (SELECT COUNT(ph.id) FROM project_phases ph WHERE ph.project_id = p.id) as phases_count
      FROM projects p
      LEFT JOIN users u1 ON u1.id = p.project_manager_id
      LEFT JOIN users u2 ON u2.id = p.site_engineer_id
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

    sql += ` ORDER BY p.created_at DESC`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[GET /api/projects]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, client_name, client_contact, location, start_date, end_date, contract_value, status, description } = body;

    const userRole = request.headers.get('x-user-role') || 'admin';
    const rawUserName = request.headers.get('x-user-name') || 'مستخدم النظام';
    let userName = 'مستخدم النظام';
    try {
      userName = decodeURIComponent(rawUserName);
    } catch {
      userName = rawUserName;
    }
    const requireApproval = request.headers.get('x-require-approval') === 'true' || userRole === 'secondary';


    if (requireApproval) {
      const approval = await createApprovalRequest(
        userName,
        userRole,
        'projects',
        'CREATE',
        'project',
        `إضافة مشروع جديد: ${name}`,
        body
      );
      return NextResponse.json({
        pending_approval: true,
        message: 'تم إرسال طلب إضافة المشروع إلى مدير النظام للموافقة عليه أولاً.',
        data: approval
      }, { status: 202 });
    }

    // Ensure project_documents table exists
    await query(`
      CREATE TABLE IF NOT EXISTS project_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        document_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

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

    const newProject = result.rows[0];

    // Store uploaded files in project_documents table
    if (body.uploaded_files && Array.isArray(body.uploaded_files)) {
      for (const file of body.uploaded_files) {
        await query(
          `INSERT INTO project_documents (
            project_id, document_name, file_url
          ) VALUES ($1, $2, $3)`,
          [newProject.id, file.name, file.key]
        );
      }
    }

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

