/**
 * Client-side helper for Direct Cloudflare R2 Uploads
 * Requests a presigned PUT URL and uploads the file directly from the browser to Cloudflare R2.
 * This completely bypasses Vercel servers and incurs 0 bytes of Vercel transfer!
 */
export async function uploadFileDirectlyToR2(
  file: File,
  folder: string = 'documents'
): Promise<{ key: string; filename: string }> {
  try {
    // 1. Get Presigned PUT URL from API (lightweight JSON ~200 bytes)
    const presignRes = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        folder,
      }),
    });

    if (presignRes.ok) {
      const { uploadUrl, key } = await presignRes.json();
      
      // 2. Upload file directly from browser to Cloudflare R2 (0 bytes through Vercel!)
      const r2Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (r2Res.ok) {
        return { key, filename: file.name };
      }
      console.warn('Direct R2 PUT failed (likely CORS), falling back to server route...');
    }
  } catch (err) {
    console.warn('Direct upload error, falling back to server route:', err);
  }

  // Fallback to server route if direct R2 upload fails or if R2 CORS is not set up yet
  const formData = new FormData();
  formData.append('file', file);
  const fallbackRes = await fetch('/api/employees/upload', {
    method: 'POST',
    body: formData,
  });

  if (!fallbackRes.ok) {
    const errorData = await fallbackRes.json().catch(() => ({}));
    throw new Error(errorData.error || `فشل رفع الملف ${file.name}`);
  }

  const data = await fallbackRes.json();
  return { key: data.key, filename: data.filename || file.name };
}
