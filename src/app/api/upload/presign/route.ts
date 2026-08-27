import { NextResponse, NextRequest } from 'next/server';
import { getPresignedUploadUrl } from '@/lib/r2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, contentType, folder } = body;
    if (!filename) {
      return NextResponse.json({ error: 'اسم الملف مطلوب.' }, { status: 400 });
    }

    const presignedData = await getPresignedUploadUrl(
      filename,
      contentType || 'application/octet-stream',
      folder || 'documents'
    );
    return NextResponse.json(presignedData);
  } catch (error) {
    const err = error as Error;
    console.error('[POST /api/upload/presign]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
