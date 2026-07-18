import { NextResponse, NextRequest } from 'next/server';
import { getR2Config, getBackupFromR2 } from '@/lib/r2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'اسم الملف (Key) مطلوب للتنزيل.' }, { status: 400 });
  }

  try {
    const config = await getR2Config();
    if (!config) {
      return NextResponse.json({ error: 'لم يتم إعداد بيانات الاتصال بـ Cloudflare R2.' }, { status: 400 });
    }

    const backupContent = await getBackupFromR2(key, config);

    // Return as a JSON file download response
    return new Response(backupContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${key}"`,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
