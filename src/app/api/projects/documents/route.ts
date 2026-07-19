import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, document_name, file_url } = body;

    if (!project_id || !document_name || !file_url) {
      return NextResponse.json(
        { error: 'الحقول التالية مطلوبة: project_id, document_name, file_url' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO project_documents (project_id, document_name, file_url)
       VALUES ($1, $2, $3) RETURNING *`,
      [project_id, document_name, file_url]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    const err = error as Error;
    console.error('[POST /api/projects/documents]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
