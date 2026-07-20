import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

async function ensureInspectionSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS project_inspection_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id),
        category TEXT NOT NULL CHECK (category IN ('site_photos', 'testing_commissioning', 'civil_defense_cert', 'other_reports')),
        title TEXT NOT NULL,
        description TEXT,
        report_date DATE DEFAULT CURRENT_DATE,
        file_url TEXT NOT NULL,
        inspector_name TEXT,
        status TEXT DEFAULT 'approved',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error('Failed to ensure inspection schema:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureInspectionSchema();
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('project_id') ?? '';
    const category = searchParams.get('category') ?? '';

    if (!projectId) {
      return NextResponse.json({ error: 'project_id مطلوب' }, { status: 400 });
    }

    const conditions: string[] = ['pir.project_id = $1'];
    const params: unknown[] = [projectId];
    let pIdx = 2;

    if (category) {
      conditions.push(`pir.category = $${pIdx}`);
      params.push(category);
      pIdx++;
    }

    const res = await query(
      `SELECT
          pir.*,
          p.name AS project_name
        FROM project_inspection_reports pir
        LEFT JOIN projects p ON p.id = pir.project_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY pir.report_date DESC, pir.created_at DESC`,
      params
    );

    return NextResponse.json({ data: res.rows });
  } catch (error: any) {
    console.error('[GET /api/projects/inspections]', error);
    return NextResponse.json({ error: error?.message || 'فشل جلب التقارير الفنية والمعاينات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureInspectionSchema();
    const body = await request.json();
    const { project_id, category = 'site_photos', title, description, report_date = new Date().toISOString().split('T')[0], file_url, inspector_name } = body;

    if (!project_id || !title || !file_url) {
      return NextResponse.json({ error: 'إجبارياً: اختيار المشروع، العنوان، وإرفاق الملف/التقرير' }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO project_inspection_reports (
        project_id, category, title, description, report_date, file_url, inspector_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [project_id, category, title, description ?? null, report_date, file_url, inspector_name ?? 'مهندس الموقع']
    );

    return NextResponse.json({
      data: res.rows[0],
      message: 'تم إرفاق التقرير الفني وشهادات المعاينة بنجاح.'
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/projects/inspections]', error);
    return NextResponse.json({ error: error?.message || 'فشل إرفاق التقرير الفني' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureInspectionSchema();
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

    await query('DELETE FROM project_inspection_reports WHERE id = $1', [id]);
    return NextResponse.json({ message: 'تم حذف التقرير الفني بنجاح.' });
  } catch (error: any) {
    console.error('[DELETE /api/projects/inspections]', error);
    return NextResponse.json({ error: error?.message || 'فشل حذف التقرير' }, { status: 500 });
  }
}
