import { NextResponse, NextRequest } from 'next/server';
import { getR2Config } from '@/lib/r2';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: NextRequest) {
  try {
    const config = await getR2Config();
    if (!config) {
      return NextResponse.json({ error: 'لم يتم إعداد بيانات Cloudflare R2 بعد.' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'لم يتم توفير أي ملف للرفع.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Sanitize filename
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `employees/${Date.now()}_${sanitizedFilename}`;

    const s3 = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    await s3.send(new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));

    return NextResponse.json({ success: true, key, filename: file.name });
  } catch (error) {
    const err = error as Error;
    console.error('[POST /api/employees/upload]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
