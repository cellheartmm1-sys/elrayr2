import { NextResponse, NextRequest } from 'next/server';
import { getPresignedDownloadUrl, getR2Config, createS3Client } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'اسم الملف (key) مطلوب.' }, { status: 400 });
    }

    // Try direct redirect to presigned R2 download URL (0 bytes Vercel data transfer)
    try {
      const downloadUrl = await getPresignedDownloadUrl(key, 3600);
      return NextResponse.redirect(downloadUrl, { status: 307 });
    } catch (presignError) {
      console.warn('Presigned redirect failed, falling back to direct stream:', presignError);
    }

    const config = await getR2Config();
    if (!config) {
      return NextResponse.json({ error: 'لم يتم إعداد Cloudflare R2.' }, { status: 400 });
    }

    const s3 = createS3Client(config);
    const response = await s3.send(new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    }));

    if (!response.Body) {
      return NextResponse.json({ error: 'الملف غير موجود.' }, { status: 404 });
    }

    let contentType = 'application/octet-stream';
    const lowerKey = key.toLowerCase();
    if (lowerKey.endsWith('.pdf')) contentType = 'application/pdf';
    else if (lowerKey.endsWith('.png')) contentType = 'image/png';
    else if (lowerKey.endsWith('.jpg') || lowerKey.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (lowerKey.endsWith('.gif')) contentType = 'image/gif';
    else if (lowerKey.endsWith('.xls')) contentType = 'application/vnd.ms-excel';
    else if (lowerKey.endsWith('.xlsx')) contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (lowerKey.endsWith('.doc')) contentType = 'application/msword';
    else if (lowerKey.endsWith('.docx')) contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // @ts-ignore
    const webStream = response.Body.transformToWebStream();

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(key.split('/').pop() || key)}"`,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('[GET /api/r2-file]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
