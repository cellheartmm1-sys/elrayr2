import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const employeeId = searchParams.get('employee_id') ?? '';
    const documentType = searchParams.get('document_type') ?? '';
    // alert_status: 'expired' | 'expiring_soon' | 'valid'
    const alertStatus = searchParams.get('alert_status') ?? '';
    const search = searchParams.get('search') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (employeeId) {
      conditions.push(`d.employee_id = $${paramIndex}`);
      params.push(employeeId);
      paramIndex++;
    }

    if (documentType) {
      conditions.push(`d.document_type = $${paramIndex}`);
      params.push(documentType);
      paramIndex++;
    }

    if (alertStatus === 'expired') {
      conditions.push(`d.expiry_date < CURRENT_DATE`);
    } else if (alertStatus === 'expiring_soon') {
      // Within 30 days
      conditions.push(`d.expiry_date >= CURRENT_DATE AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days'`);
    } else if (alertStatus === 'valid') {
      conditions.push(`(d.expiry_date IS NULL OR d.expiry_date > CURRENT_DATE + INTERVAL '30 days')`);
    }

    if (search) {
      conditions.push(`(e.full_name ILIKE $${paramIndex} OR d.document_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM employee_documents d
        JOIN employees e ON e.id = d.employee_id
        ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          d.id,
          d.employee_id,
          e.employee_number,
          e.full_name AS employee_name,
          d.document_type,
          d.document_number,
          d.issue_date,
          d.expiry_date,
          CASE
            WHEN d.expiry_date < CURRENT_DATE THEN 'expired'
            WHEN d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'valid'
          END AS alert_status,
          (d.expiry_date - CURRENT_DATE) AS days_until_expiry,
          d.file_url,
          d.notes,
          d.created_at,
          d.updated_at
        FROM employee_documents d
        JOIN employees e ON e.id = d.employee_id
        ${where}
        ORDER BY d.expiry_date ASC NULLS LAST
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
    console.error('[GET /api/hr/documents]', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      document_type,
      document_number,
      issue_date,
      expiry_date,
      file_url,
      notes,
    } = body;

    if (!employee_id || !document_type) {
      return NextResponse.json(
        { error: 'employee_id and document_type are required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO employee_documents (employee_id, document_type, document_number, issue_date, expiry_date, file_url, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`,
      [
        employee_id,
        document_type,
        document_number ?? null,
        issue_date ?? null,
        expiry_date ?? null,
        file_url ?? null,
        notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/hr/documents]', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
