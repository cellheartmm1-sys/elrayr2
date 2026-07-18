import { NextResponse, NextRequest } from 'next/server';
import { getR2Config, listBackupsFromR2, uploadBackupToR2 } from '@/lib/r2';

export async function GET() {
  try {
    const config = await getR2Config();
    if (!config) {
      return NextResponse.json({ error: 'لم يتم إعداد بيانات الاتصال بـ Cloudflare R2 بعد.' }, { status: 400 });
    }
    const backups = await listBackupsFromR2(config);
    return NextResponse.json(backups);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = await getR2Config();
    if (!config) {
      return NextResponse.json({ error: 'لم يتم إعداد بيانات الاتصال بـ Cloudflare R2 بعد.' }, { status: 400 });
    }
    const result = await uploadBackupToR2(config);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
