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

    const combinedQuery = `
      WITH all_docs AS (
        SELECT
          d.id,
          d.employee_id,
          e.employee_number,
          e.full_name AS full_name,
          e.full_name AS employee_name,
          d.document_type,
          d.document_number,
          d.issue_date,
          d.expiry_date,
          d.file_url,
          d.notes,
          d.created_at
        FROM employee_documents d
        JOIN employees e ON e.id = d.employee_id

        UNION ALL

        SELECT
          (e.id || '-iqama')::TEXT AS id,
          e.id AS employee_id,
          e.employee_number,
          e.full_name AS full_name,
          e.full_name AS employee_name,
          'iqama' AS document_type,
          e.iqama_number AS document_number,
          NULL::DATE AS issue_date,
          e.iqama_expiry AS expiry_date,
          NULL AS file_url,
          'إقامة الموظف المسجلة بالملف' AS notes,
          e.created_at
        FROM employees e
        WHERE e.iqama_expiry IS NOT NULL

        UNION ALL

        SELECT
          (e.id || '-passport')::TEXT AS id,
          e.id AS employee_id,
          e.employee_number,
          e.full_name AS full_name,
          e.full_name AS employee_name,
          'passport' AS document_type,
          e.passport_number AS document_number,
          NULL::DATE AS issue_date,
          e.passport_expiry AS expiry_date,
          NULL AS file_url,
          'جواز سفر الموظف المسجل بالملف' AS notes,
          e.created_at
        FROM employees e
        WHERE e.passport_expiry IS NOT NULL
      )
      SELECT
        id, employee_id, employee_number, full_name, employee_name, document_type, document_number,
        issue_date, expiry_date, file_url, notes, created_at,
        CASE
          WHEN expiry_date < CURRENT_DATE THEN 'expired'
          WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
          ELSE 'valid'
        END AS alert_status,
        (expiry_date - CURRENT_DATE) AS days_remaining,
        (expiry_date - CURRENT_DATE) AS days_until_expiry
      FROM all_docs d
      ${where}
      ORDER BY expiry_date ASC NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      WITH all_docs AS (
        SELECT d.id, d.employee_id, e.full_name, d.document_type, d.document_number, d.expiry_date
        FROM employee_documents d JOIN employees e ON e.id = d.employee_id
        UNION ALL
        SELECT e.id || '-iqama', e.id, e.full_name, 'iqama', e.iqama_number, e.iqama_expiry FROM employees e WHERE e.iqama_expiry IS NOT NULL
        UNION ALL
        SELECT e.id || '-passport', e.id, e.full_name, 'passport', e.passport_number, e.passport_expiry FROM employees e WHERE e.passport_expiry IS NOT NULL
      )
      SELECT COUNT(*) AS total FROM all_docs d ${where}
    `;

    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);
    const dataResult = await query(combinedQuery, [...params, limit, offset]);

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
