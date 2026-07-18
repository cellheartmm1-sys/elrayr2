import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const res = await query('SELECT * FROM currencies WHERE is_default = TRUE LIMIT 1');
    if (res.rows.length === 0) {
      // Return fallback
      return NextResponse.json({ code: 'EGP', symbol: 'ج.م', name_ar: 'الجنيه المصري' });
    }
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
