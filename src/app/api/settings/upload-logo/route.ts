import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File;
    if (!file) {
      return NextResponse.json({ error: 'لم يتم اختيار أي ملف لوجو.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP).' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString('base64');
    const logoUrl = `data:${file.type};base64,${base64Data}`;

    // Update company table directly
    const check = await query('SELECT id FROM companies LIMIT 1');
    if (check.rows.length > 0) {
      await query('UPDATE companies SET logo_url = $1 WHERE id = $2', [logoUrl, check.rows[0].id]);
    }

    return NextResponse.json({ success: true, logo_url: logoUrl });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[POST /api/settings/upload-logo]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
