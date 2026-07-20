import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

async function ensureChangeOrderSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS project_change_orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        change_order_number TEXT UNIQUE NOT NULL,
        project_id UUID NOT NULL REFERENCES projects(id),
        title TEXT NOT NULL,
        description TEXT,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        requested_by TEXT,
        approval_date DATE,
        status TEXT DEFAULT 'approved' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error('Failed to ensure change order schema:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureChangeOrderSchema();
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('project_id') ?? '';
    const status = searchParams.get('status') ?? '';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (projectId) { conditions.push(`co.project_id = $${pIdx}`); params.push(projectId); pIdx++; }
    if (status) { conditions.push(`co.status = $${pIdx}`); params.push(status); pIdx++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const res = await query(
      `SELECT
          co.*,
          p.name AS project_name,
          p.code AS project_code
        FROM project_change_orders co
        LEFT JOIN projects p ON p.id = co.project_id
        ${where}
        ORDER BY co.created_at DESC`,
      params
    );

    return NextResponse.json({ data: res.rows });
  } catch (error: any) {
    console.error('[GET /api/projects/change-orders]', error);
    return NextResponse.json({ error: error?.message || 'فشل جلب أوامر التغيير' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureChangeOrderSchema();
    const body = await request.json();
    const { project_id, title, description, amount, requested_by, status = 'approved', notes } = body;

    if (!project_id || !title || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'إجبارياً: اختيار المشروع وعنوان وقيمة أمر التغيير' }, { status: 400 });
    }

    // Generate Change Order Number CO-001
    const lastRes = await query(`SELECT change_order_number FROM project_change_orders WHERE change_order_number LIKE 'CO-%' ORDER BY created_at DESC LIMIT 1`);
    let nextNum = 1;
    if (lastRes.rows.length > 0) {
      const match = lastRes.rows[0].change_order_number.match(/\d+/);
      if (match) nextNum = parseInt(match[0], 10) + 1;
    }
    const coNumber = `CO-${String(nextNum).padStart(3, '0')}`;

    const res = await query(
      `INSERT INTO project_change_orders (
        change_order_number, project_id, title, description, amount, requested_by, status, approval_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        coNumber,
        project_id,
        title,
        description ?? null,
        amount,
        requested_by ?? 'استشاري المشروع / المالك',
        status,
        status === 'approved' ? new Date().toISOString().split('T')[0] : null,
        notes ?? null
      ]
    );

    return NextResponse.json({
      data: res.rows[0],
      message: `تم اعتماد وتسجيل أمر التغيير (${coNumber}) بنجاح.`
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/projects/change-orders]', error);
    return NextResponse.json({ error: error?.message || 'فشل إضافة أمر التغيير' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureChangeOrderSchema();
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id و status مطلوبان' }, { status: 400 });
    }

    const res = await query(
      `UPDATE project_change_orders
       SET status = $1, approval_date = CASE WHEN $1 = 'approved' THEN CURRENT_DATE ELSE approval_date END, notes = COALESCE($2, notes)
       WHERE id = $3 RETURNING *`,
      [status, notes ?? null, id]
    );

    return NextResponse.json({ data: res.rows[0], message: `تم تحديث حالة أمر التغيير بنجاح.` });
  } catch (error: any) {
    console.error('[PUT /api/projects/change-orders]', error);
    return NextResponse.json({ error: error?.message || 'فشل تحديث أمر التغيير' }, { status: 500 });
  }
}
