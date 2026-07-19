import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

async function ensureTableExists() {
  await query(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      phone VARCHAR(100) NOT NULL,
      email VARCHAR(255),
      message TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function GET() {
  try {
    await ensureTableExists();
    const res = await query(`
      SELECT * FROM contact_requests 
      ORDER BY created_at DESC
    `);
    return NextResponse.json(res.rows);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTableExists();
    const body = await request.json();
    const { name, company, phone, email, message } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'الاسم ورقم الجوال مطلوبان.' }, { status: 400 });
    }

    const res = await query(`
      INSERT INTO contact_requests (name, company, phone, email, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, company || null, phone, email || null, message || null]);

    return NextResponse.json(res.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureTableExists();
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'المعرف ID مطلوب للتحديث.' }, { status: 400 });
    }

    const res = await query(`
      UPDATE contact_requests
      SET status = COALESCE($1, status),
          notes = COALESCE($2, notes)
      WHERE id = $3
      RETURNING *
    `, [status, notes, id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'طلب الاستفسار غير موجود.' }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureTableExists();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'المعرف ID مطلوب للحذف.' }, { status: 400 });
    }

    await query('DELETE FROM contact_requests WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
