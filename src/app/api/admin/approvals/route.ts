import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    let sql = 'SELECT * FROM pending_approvals';
    const params: any[] = [];

    if (status !== 'all') {
      sql += ' WHERE status = $1';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { approval_id, action, rejection_reason, approved_by } = body;

    if (!approval_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'الطلب غير صالح' }, { status: 400 });
    }

    // Fetch the pending request
    const pendingResult = await query('SELECT * FROM pending_approvals WHERE id = $1', [approval_id]);
    if (pendingResult.rows.length === 0) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }

    const pendingItem = pendingResult.rows[0];

    if (pendingItem.status !== 'pending') {
      return NextResponse.json({ error: 'لقد تم اتخاذ إجراء بشأن هذا الطلب مسبقاً' }, { status: 400 });
    }

    if (action === 'reject') {
      await query(
        `UPDATE pending_approvals 
         SET status = 'rejected', rejection_reason = $1, updated_at = NOW() 
         WHERE id = $2`,
        [rejection_reason || 'تم الرفض بواسطة المدير العام', approval_id]
      );
      return NextResponse.json({ success: true, message: 'تم رفض الطلب بنجاح' });
    }

    // Process Approval: Execute action details depending on entity_type
    const { entity_type, action_type, details } = pendingItem;
    let appliedResult = null;

    if (action_type === 'CREATE') {
      if (entity_type === 'project') {
        const { name, code, client_name, location, start_date, end_date, contract_value, status, description } = details;
        appliedResult = await query(
          `INSERT INTO projects (name, code, client_name, location, start_date, end_date, contract_value, status, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [name, code, client_name, location || null, start_date || null, end_date || null, contract_value || 0, status || 'active', description || null]
        );
      } else if (entity_type === 'employee') {
        const { full_name, email, role, phone, is_active } = details;
        appliedResult = await query(
          `INSERT INTO users (full_name, email, role, phone, is_active)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [full_name, email, role, phone || null, is_active !== undefined ? is_active : true]
        );
      } else if (entity_type === 'project_expense') {
        const { project_id, expense_date, category, description, amount, supplier, invoice_number } = details;
        appliedResult = await query(
          `INSERT INTO project_expenses (project_id, expense_date, category, description, amount, supplier, invoice_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [project_id, expense_date || new Date(), category, description, amount, supplier || null, invoice_number || null]
        );
      } else if (entity_type === 'material_request') {
        const { request_number, project_id, warehouse_id, request_date, required_date, priority, notes } = details;
        appliedResult = await query(
          `INSERT INTO material_requests (request_number, project_id, warehouse_id, request_date, required_date, status, priority, notes)
           VALUES ($1, $2, $3, $4, $5, 'approved', $6, $7) RETURNING *`,
          [request_number, project_id, warehouse_id || null, request_date || new Date(), required_date || null, priority || 'normal', notes || null]
        );
      } else if (entity_type === 'subcontractor') {
        const { name, specialty, contact_person, phone, email, cr_number, notes } = details;
        appliedResult = await query(
          `INSERT INTO subcontractors (name, specialty, contact_person, phone, email, cr_number, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [name, specialty || 'other', contact_person || null, phone || null, email || null, cr_number || null, notes || null]
        );
      } else if (entity_type === 'maintenance_contract') {
        const { contract_number, client_name, client_phone, site_address, system_type, start_date, end_date, annual_value } = details;
        appliedResult = await query(
          `INSERT INTO maintenance_contracts (contract_number, client_name, client_phone, site_address, system_type, start_date, end_date, annual_value)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [contract_number, client_name, client_phone || null, site_address || null, system_type || 'all', start_date || null, end_date || null, annual_value || 0]
        );
      }
    } else if (action_type === 'DELETE') {
      if (entity_type === 'project' && details.id) {
        appliedResult = await query('DELETE FROM projects WHERE id = $1', [details.id]);
      } else if (entity_type === 'subcontractor' && details.id) {
        appliedResult = await query('DELETE FROM subcontractors WHERE id = $1', [details.id]);
      }
    }

    // Update pending approval status
    await query(
      `UPDATE pending_approvals 
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW() 
       WHERE id = $2`,
      [approved_by || null, approval_id]
    );

    return NextResponse.json({
      success: true,
      message: 'تمت الموافقة على الطلب وتنفيذه بالنظام بنجاح',
      data: appliedResult?.rows?.[0] || null
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
