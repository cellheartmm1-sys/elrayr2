import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const res = await query('SELECT * FROM companies ORDER BY created_at ASC LIMIT 1');
    if (res.rows.length === 0) {
      // Return a default mock so there's always data
      return NextResponse.json({
        name_ar: 'الرايق للمقاولات الكهروميكانيكية',
        name_en: 'Al-Rayeq Electromechanical Contracting',
        cr_number: '1010123456',
        vat_number: '300012345600003',
        address: 'القاهرة، مصر / الرياض، المملكة العربية السعودية',
        phone: '+20-100-000-0000',
        email: 'info@alrayeq.com'
      });
    }
    return NextResponse.json(res.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name_ar, name_en, cr_number, vat_number, address, phone, email } = body;

    // Check if any company exists
    const check = await query('SELECT id FROM companies LIMIT 1');
    
    let result;
    if (check.rows.length === 0) {
      result = await query(`
        INSERT INTO companies (name_ar, name_en, cr_number, vat_number, address, phone, email)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `, [name_ar, name_en, cr_number, vat_number, address, phone, email]);
    } else {
      const companyId = check.rows[0].id;
      result = await query(`
        UPDATE companies SET
          name_ar = $1, name_en = $2, cr_number = $3, vat_number = $4, address = $5, phone = $6, email = $7
        WHERE id = $8 RETURNING *
      `, [name_ar, name_en, cr_number, vat_number, address, phone, email, companyId]);
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
