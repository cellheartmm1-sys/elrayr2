import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'معرّف الفاتورة غير صالح' }, { status: 400 });
  }

  const result = await query(
    'SELECT receipt_image_url FROM petty_cash_claims WHERE id = $1',
    [id]
  );
  const receiptUrl = result.rows[0]?.receipt_image_url;

  if (!receiptUrl || typeof receiptUrl !== 'string') {
    return NextResponse.json({ error: 'لا توجد صورة إيصال لهذه الفاتورة' }, { status: 404 });
  }

  const dataUrl = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(receiptUrl);
  if (dataUrl) {
    const contentType = dataUrl[1].toLowerCase();
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'نوع ملف الإيصال غير مدعوم' }, { status: 415 });
    }

    const imageBytes = Uint8Array.from(Buffer.from(dataUrl[2], 'base64'));
    return new Response(imageBytes, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(imageBytes.byteLength),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }

  if (/^https?:\/\//i.test(receiptUrl)) {
    return NextResponse.redirect(receiptUrl);
  }

  return NextResponse.json({ error: 'صيغة صورة الإيصال غير مدعومة' }, { status: 415 });
}
