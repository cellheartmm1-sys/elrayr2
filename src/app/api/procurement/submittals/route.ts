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
      conditions.push(`ms.submitted_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`ms.submitted_date <= $${paramIndex}`);
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
          ms.item_description,
          ms.brand,
          ms.model,
          ms.origin,
          ms.consultant_name,
          ms.submitted_by,
          e.full_name AS submitted_by_name,
          ms.submitted_date,
          ms.status,
          ms.response_date,
          ms.comments,
          ms.created_at
        FROM material_submittals ms
        LEFT JOIN projects p ON p.id = ms.project_id
        LEFT JOIN employees e ON e.id = ms.submitted_by
        ${where}
        ORDER BY ms.submitted_date DESC NULLS LAST
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
      // Accept either old field names (from form) or new schema names
      item_description,
      brand,
      model,
      origin,
      consultant_name,
      submitted_by,
      submitted_date,
      submission_date, // legacy alias
      comments,
      // Old fields mapped to new schema
      title,
      description,
    } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    if (!submitted_by) {
      return NextResponse.json({ error: 'submitted_by is required' }, { status: 400 });
    }

    // Resolve item_description from various possible field names
    const resolvedDescription = item_description || description || title || '';
    if (!resolvedDescription) {
      return NextResponse.json({ error: 'item_description is required' }, { status: 400 });
    }

    const generatedSubNumber = submittal_number || `SUB-${Math.floor(100000 + Math.random() * 900000)}`;
    const finalDate = submitted_date || submission_date || new Date().toISOString().split('T')[0];

    const result = await query(
      `INSERT INTO material_submittals (
          submittal_number, project_id, item_description, brand, model, origin,
          consultant_name, submitted_by, submitted_date, status, comments
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10)
        RETURNING *`,
      [
        generatedSubNumber,
        project_id,
        resolvedDescription,
        brand ?? null,
        model ?? null,
        origin ?? null,
        consultant_name ?? null,
        submitted_by,
        finalDate,
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
