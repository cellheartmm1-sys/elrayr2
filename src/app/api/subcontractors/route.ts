import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') ?? '';
    const specialty = searchParams.get('specialty') ?? '';
    const status = searchParams.get('status') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(
        `(s.name ILIKE $${paramIndex} OR s.contact_person ILIKE $${paramIndex} OR s.phone ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (specialty) {
      conditions.push(`s.specialty = $${paramIndex}`);
      params.push(specialty);
      paramIndex++;
    }

    if (status) {
      conditions.push(`s.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM subcontractors s ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          s.id,
          s.name,
          s.contact_person,
          s.phone,
          s.email,
          s.address,
          s.specialty,
          s.cr_number,
          s.vat_number,
          s.status,
          s.rating,
          s.notes,
          s.created_at,
          s.updated_at
        FROM subcontractors s
        ${where}
        ORDER BY s.name ASC
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
    console.error('[GET /api/subcontractors]', error);
    return NextResponse.json(
      { error: 'Failed to fetch subcontractors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      contact_person,
      phone,
      email,
      address,
      specialty,
      cr_number,
      vat_number,
      status = 'active',
      rating,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    if (cr_number) {
      const existing = await query(
        'SELECT id FROM subcontractors WHERE cr_number = $1',
        [cr_number]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'CR number already registered' },
          { status: 409 }
        );
      }
    }

    const result = await query(
      `INSERT INTO subcontractors (name, contact_person, phone, email, address, specialty, cr_number, vat_number, status, rating, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *`,
      [
        name,
        contact_person ?? null,
        phone ?? null,
        email ?? null,
        address ?? null,
        specialty ?? null,
        cr_number ?? null,
        vat_number ?? null,
        status,
        rating ?? null,
        notes ?? null,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/subcontractors]', error);
    return NextResponse.json(
      { error: 'Failed to create subcontractor' },
      { status: 500 }
    );
  }
}
