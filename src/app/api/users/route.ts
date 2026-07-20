import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

async function ensureAdminAccounts() {
  try {
    // Ensure at least one active admin account exists in database
    const check = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = true");
    if (check.rows.length === 0) {
      await query(`
        INSERT INTO users (full_name, username, email, password, role, is_active)
        VALUES ('مدير النظام (Admin)', 'admin', 'admin@alrayeq.com', '123456', 'admin', true)
      `);
    }
  } catch (e) {
    console.error('Error ensuring admin account:', e);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureAdminAccounts();
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
    const { full_name, username, email, password, role, phone } = body;

    if (!full_name || !email) {
      return NextResponse.json({ error: 'الاسم الكامل والبريد الإلكتروني مطلوبان' }, { status: 400 });
    }

    const finalUsername = username ? username.trim().toLowerCase() : email.split('@')[0];
    const finalPassword = password && password.trim() ? password.trim() : '123456';

    const result = await query(`
      INSERT INTO users (full_name, username, email, password, role, phone, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *
    `, [full_name, finalUsername, email, finalPassword, role || 'secondary', phone || null]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, full_name, username, email, password, role, phone, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم غير محدد' }, { status: 400 });
    }

    const finalUsername = username ? username.trim().toLowerCase() : (email ? email.split('@')[0] : null);

    let sql = `
      UPDATE users 
      SET full_name = $1, username = $2, email = $3, role = $4, phone = $5, is_active = $6
    `;
    const params = [full_name, finalUsername, email, role, phone || null, is_active !== undefined ? is_active : true];

    if (password && password.trim()) {
      sql += `, password = $${params.length + 1}`;
      params.push(password.trim());
    }

    sql += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(id);

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    await query('UPDATE users SET is_active = false WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'تم حذف الحساب بنجاح' });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
