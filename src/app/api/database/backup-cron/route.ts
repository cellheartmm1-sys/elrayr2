import { NextResponse } from 'next/server';
import { getR2Config, uploadBackupToR2 } from '@/lib/r2';

export async function GET() {
  try {
    const config = await getR2Config();
    if (!config) {
      return NextResponse.json({ error: 'لم يتم إعداد بيانات Cloudflare R2 بعد.' }, { status: 400 });
    }
    const result = await uploadBackupToR2(config);
    return NextResponse.json({ success: true, message: 'تم أخذ النسخة الاحتياطية وتصديرها للسحابة بنجاح.', ...result });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
