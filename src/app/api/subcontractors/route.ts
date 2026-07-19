import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';
import { createApprovalRequest } from '@/lib/approvals';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') ?? '';
    const specialty = searchParams.get('specialty') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['s.is_active = TRUE'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(s.name ILIKE $${paramIndex} OR s.contact_person ILIKE $${paramIndex} OR s.phone ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (specialty) { conditions.push(`s.specialty = $${paramIndex}`); params.push(specialty); paramIndex++; }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query(`SELECT COUNT(*) AS total FROM subcontractors s ${where}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          s.id,
          s.name,
          s.contact_person,
          s.phone,
          s.email,
          s.specialty,
          s.cr_number,
          s.is_active,
          s.rating,
          s.notes,
          s.created_at
        FROM subcontractors s
        ${where}
        ORDER BY s.name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/subcontractors]', error);
    return NextResponse.json({ error: 'Failed to fetch subcontractors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contact_person, phone, email, specialty, cr_number, rating, notes } = body;

    if (!name) return NextResponse.json({ error: 'اسم المقاول مطلوب' }, { status: 400 });

    const userRole = request.headers.get('x-user-role') || 'admin';
    const rawUserName = request.headers.get('x-user-name') || 'مستخدم النظام';
    let userName = 'مستخدم النظام';
    try { userName = decodeURIComponent(rawUserName); } catch {}
    const requireApproval = request.headers.get('x-require-approval') === 'true' || userRole === 'secondary';

    if (requireApproval) {
      const approval = await createApprovalRequest(
        userName,
        userRole,
        'subcontractors',
        'CREATE',
        'subcontractor',
        `إضافة مقاول جديد: ${name}`,
        body
      );
      return NextResponse.json({
        pending_approval: true,
        message: 'تم إرسال طلب إضافة المقاول إلى مدير النظام للموافقة عليه أولاً.',
        data: approval
      }, { status: 202 });
    }

    if (cr_number) {
      const existing = await query('SELECT id FROM subcontractors WHERE cr_number = $1', [cr_number]);
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'رقم السجل التجاري مسجل مسبقاً' }, { status: 409 });
      }
    }

    const result = await query(
      `INSERT INTO subcontractors (name, contact_person, phone, email, specialty, cr_number, is_active, rating, notes)
        VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$8)
        RETURNING *`,
      [name, contact_person ?? null, phone ?? null, email ?? null, specialty ?? null, cr_number ?? null, Number(rating) || 4, notes ?? null]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/subcontractors]', error);
    return NextResponse.json({ error: 'فشل إضافة المقاول' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, contact_person, phone, email, specialty, cr_number, rating, notes } = body;

    if (!id || !name) return NextResponse.json({ error: 'بيانات المقاول غير مكتملة' }, { status: 400 });

    const userRole = request.headers.get('x-user-role') || 'admin';
    const rawUserName = request.headers.get('x-user-name') || 'مستخدم النظام';
    let userName = 'مستخدم النظام';
    try { userName = decodeURIComponent(rawUserName); } catch {}
    const requireApproval = request.headers.get('x-require-approval') === 'true' || userRole === 'secondary';

    if (requireApproval) {
      const approval = await createApprovalRequest(
        userName,
        userRole,
        'subcontractors',
        'UPDATE',
        'subcontractor',
        `تعديل بيانات المقاول: ${name}`,
        body
      );
      return NextResponse.json({
        pending_approval: true,
        message: 'تم إرسال طلب تعديل المقاول إلى مدير النظام للموافقة عليه أولاً.',
        data: approval
      }, { status: 202 });
    }

    const result = await query(
      `UPDATE subcontractors 
       SET name=$1, contact_person=$2, phone=$3, email=$4, specialty=$5, cr_number=$6, rating=$7, notes=$8
       WHERE id=$9 RETURNING *`,
      [name, contact_person ?? null, phone ?? null, email ?? null, specialty ?? null, cr_number ?? null, Number(rating) || 4, notes ?? null, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'المقاول غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[PUT /api/subcontractors]', error);
    return NextResponse.json({ error: 'فشل تعديل بيانات المقاول' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'معرف المقاول مطلوب' }, { status: 400 });

    const userRole = request.headers.get('x-user-role') || 'admin';
    const rawUserName = request.headers.get('x-user-name') || 'مستخدم النظام';
    let userName = 'مستخدم النظام';
    try { userName = decodeURIComponent(rawUserName); } catch {}
    const requireApproval = request.headers.get('x-require-approval') === 'true' || userRole === 'secondary';

    const subRes = await query('SELECT id, name FROM subcontractors WHERE id = $1', [id]);
    const sub = subRes.rows[0];

    if (!sub) return NextResponse.json({ error: 'المقاول غير موجود' }, { status: 404 });

    if (requireApproval) {
      const approval = await createApprovalRequest(
        userName,
        userRole,
        'subcontractors',
        'DELETE',
        'subcontractor',
        `طلب حذف مقاول: ${sub.name}`,
        { id, name: sub.name }
      );
      return NextResponse.json({
        pending_approval: true,
        message: 'تم إرسال طلب حذف المقاول إلى مدير النظام للموافقة عليه أولاً.',
        data: approval
      }, { status: 202 });
    }

    // Soft delete subcontractor or cascade update
    await query('UPDATE subcontractors SET is_active = FALSE WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'تم حذف المقاول بنجاح' });
  } catch (error) {
    console.error('[DELETE /api/subcontractors]', error);
    return NextResponse.json({ error: 'فشل حذف المقاول' }, { status: 500 });
  }
}
