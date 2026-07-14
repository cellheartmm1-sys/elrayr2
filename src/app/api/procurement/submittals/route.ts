import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('project_id') ?? '';
    const status = searchParams.get('status') ?? '';
    const submittedBy = searchParams.get('submitted_by') ?? '';
    const dateFrom = searchParams.get('date_from') ?? '';
    const dateTo = searchParams.get('date_to') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (projectId) {
      conditions.push(`ms.project_id = $${paramIndex}`);
      params.push(projectId);
      paramIndex++;
    }

    if (status) {
      conditions.push(`ms.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (submittedBy) {
      conditions.push(`ms.submitted_by = $${paramIndex}`);
      params.push(submittedBy);
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`ms.submission_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`ms.submission_date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM material_submittals ms ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          ms.id,
          ms.submittal_number,
          ms.project_id,
          p.name AS project_name,
          p.project_number,
          ms.title,
          ms.description,
          ms.category,
          ms.submitted_by,
          e.full_name AS submitted_by_name,
          ms.submission_date,
          ms.status,
          ms.reviewed_by,
          reviewer.full_name AS reviewer_name,
          ms.review_date,
          ms.revision_number,
          ms.file_url,
          ms.comments,
          ms.created_at,
          ms.updated_at
        FROM material_submittals ms
        LEFT JOIN projects p ON p.id = ms.project_id
        LEFT JOIN employees e ON e.id = ms.submitted_by
        LEFT JOIN employees reviewer ON reviewer.id = ms.reviewed_by
        ${where}
        ORDER BY ms.submission_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/procurement/submittals]', error);
    return NextResponse.json(
      { error: 'Failed to fetch material submittals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      submittal_number,
      project_id,
      title,
      description,
      category,
      submitted_by,
      submission_date,
      revision_number = 1,
      file_url,
      comments,
    } = body;

    if (!title || !submitted_by) {
      return NextResponse.json(
        { error: 'title and submitted_by are required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO material_submittals (
          submittal_number, project_id, title, description, category,
          submitted_by, submission_date, status, revision_number, file_url, comments
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10)
        RETURNING *`,
      [
        submittal_number ?? null,
        project_id ?? null,
        title,
        description ?? null,
        category ?? null,
        submitted_by,
        submission_date ?? new Date().toISOString().split('T')[0],
        revision_number,
        file_url ?? null,
        comments ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/procurement/submittals]', error);
    return NextResponse.json(
      { error: 'Failed to create material submittal' },
      { status: 500 }
    );
  }
}
