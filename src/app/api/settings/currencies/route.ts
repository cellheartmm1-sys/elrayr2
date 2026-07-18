import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

async function ensureCurrenciesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS currencies (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(10) UNIQUE NOT NULL,
      name_ar VARCHAR(50) NOT NULL,
      symbol VARCHAR(10) NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const check = await query('SELECT COUNT(*) FROM currencies');
  if (parseInt(check.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO currencies (code, name_ar, symbol, is_default) VALUES
      ('EGP', 'الجنيه المصري', 'ج.م', TRUE),
      ('SAR', 'الريال السعودي', 'ر.س', FALSE),
      ('USD', 'الدولار الأمريكي', '$', FALSE),
      ('AED', 'الدرهم الإماراتي', 'د.إ', FALSE)
    `);
  }
}

export async function GET() {
  try {
    await ensureCurrenciesTable();
    const res = await query('SELECT * FROM currencies ORDER BY created_at ASC');
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCurrenciesTable();
    const body = await request.json();
    const { action } = body;

    if (action === 'add') {
      const { code, name_ar, symbol } = body;
      if (!code || !name_ar || !symbol) {
        return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
      }
      
      const checkCode = await query('SELECT id FROM currencies WHERE code = $1', [code.toUpperCase()]);
      if (checkCode.rows.length > 0) {
        return NextResponse.json({ error: 'رمز العملة مضاف مسبقاً' }, { status: 400 });
      }

      const res = await query(`
        INSERT INTO currencies (code, name_ar, symbol, is_default)
        VALUES ($1, $2, $3, FALSE) RETURNING *
      `, [code.toUpperCase(), name_ar, symbol]);

      return NextResponse.json({ success: true, data: res.rows[0] });
    }

    if (action === 'set_default') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'معرف العملة مطلوب' }, { status: 400 });
      }

      // Start transaction or sequential queries
      await query('UPDATE currencies SET is_default = FALSE');
      const res = await query('UPDATE currencies SET is_default = TRUE WHERE id = $1 RETURNING *', [id]);

      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'العملة غير موجودة' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: res.rows[0] });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'معرف العملة مطلوب' }, { status: 400 });
      }

      // Check if it's default
      const checkDefault = await query('SELECT is_default FROM currencies WHERE id = $1', [id]);
      if (checkDefault.rows.length === 0) {
        return NextResponse.json({ error: 'العملة غير موجودة' }, { status: 404 });
      }
      if (checkDefault.rows[0].is_default) {
        return NextResponse.json({ error: 'لا يمكن حذف العملة الافتراضية النشطة للنظام' }, { status: 400 });
      }

      await query('DELETE FROM currencies WHERE id = $1', [id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
