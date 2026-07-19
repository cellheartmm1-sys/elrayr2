import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

async function ensureTableExists() {
  await query(`
    CREATE TABLE IF NOT EXISTS proposals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID,
      proposal_code VARCHAR(100),
      title VARCHAR(255) NOT NULL,
      client_name VARCHAR(255),
      scope_text TEXT,
      terms_text TEXT,
      technical_items JSONB DEFAULT '[]'::jsonb,
      financial_items JSONB DEFAULT '[]'::jsonb,
      vat_percentage NUMERIC DEFAULT 15,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function GET(request: NextRequest) {
  try {
    await ensureTableExists();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const res = await query('SELECT * FROM proposals WHERE id = $1', [id]);
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'العرض غير موجود' }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    }

    const res = await query('SELECT * FROM proposals ORDER BY created_at DESC');
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
    const {
      project_id, proposal_code, title, client_name, scope_text, terms_text,
      technical_items, financial_items, vat_percentage
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'عنوان العرض الفني والمالي مطلوب' }, { status: 400 });
    }

    const code = proposal_code || `PROP-${Math.floor(1000 + Math.random() * 9000)}`;

    const res = await query(`
      INSERT INTO proposals (
        project_id, proposal_code, title, client_name, scope_text, terms_text,
        technical_items, financial_items, vat_percentage
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
      RETURNING *
    `, [
      project_id || null,
      code,
      title,
      client_name || null,
      scope_text || null,
      terms_text || null,
      JSON.stringify(technical_items || []),
      JSON.stringify(financial_items || []),
      vat_percentage || 15
    ]);

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureTableExists();
    const body = await request.json();
    const {
      id, project_id, title, client_name, scope_text, terms_text,
      technical_items, financial_items, vat_percentage
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف العرض ID مطلوب للتحديث' }, { status: 400 });
    }

    const res = await query(`
      UPDATE proposals
      SET project_id = $1,
          title = $2,
          client_name = $3,
          scope_text = $4,
          terms_text = $5,
          technical_items = $6::jsonb,
          financial_items = $7::jsonb,
          vat_percentage = $8,
          updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      project_id || null,
      title,
      client_name || null,
      scope_text || null,
      terms_text || null,
      JSON.stringify(technical_items || []),
      JSON.stringify(financial_items || []),
      vat_percentage || 15,
      id
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'العرض غير موجود' }, { status: 404 });
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
      return NextResponse.json({ error: 'معرف العرض مطلوب' }, { status: 400 });
    }

    await query('DELETE FROM proposals WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
