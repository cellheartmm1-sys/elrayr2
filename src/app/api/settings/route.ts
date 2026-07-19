import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const isR2EnvSet = !!(
      (process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID) &&
      (process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY)
    );

    const res = await query('SELECT * FROM companies ORDER BY created_at ASC LIMIT 1');
    if (res.rows.length === 0) {
      return NextResponse.json({
        name_ar: 'الرايق للمقاولات الكهروميكانيكية',
        name_en: 'Al-Rayeq Electromechanical Contracting',
        cr_number: '1010123456',
        vat_number: '300012345600003',
        address: 'القاهرة، مصر / الرياض، المملكة العربية السعودية',
        phone: '+20-100-000-0000',
        email: 'info@alrayeq.com',
        r2_env_configured: isR2EnvSet
      });
    }
    const data = res.rows[0];
    data.r2_env_configured = isR2EnvSet;
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name_ar, name_en, cr_number, vat_number, address, phone, email,
      r2_account_id, r2_endpoint, r2_bucket_name, r2_access_key_id, r2_secret_access_key,
      r2_backup_interval_hours
    } = body;

    // Check if any company exists
    const check = await query('SELECT id FROM companies LIMIT 1');
    
    let result;
    if (check.rows.length === 0) {
      result = await query(`
        INSERT INTO companies (
          name_ar, name_en, cr_number, vat_number, address, phone, email,
          r2_account_id, r2_endpoint, r2_bucket_name, r2_access_key_id, r2_secret_access_key,
          r2_backup_interval_hours
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *
      `, [
        name_ar, name_en, cr_number, vat_number, address, phone, email,
        r2_account_id || null, r2_endpoint || null, r2_bucket_name || null,
        r2_access_key_id || null, r2_secret_access_key || null,
        r2_backup_interval_hours === undefined || r2_backup_interval_hours === '' ? 8 : Number(r2_backup_interval_hours)
      ]);
    } else {
      const companyId = check.rows[0].id;
      result = await query(`
        UPDATE companies SET
          name_ar = $1, name_en = $2, cr_number = $3, vat_number = $4, address = $5, phone = $6, email = $7,
          r2_account_id = $8, r2_endpoint = $9, r2_bucket_name = $10, r2_access_key_id = $11, r2_secret_access_key = $12,
          r2_backup_interval_hours = $13
        WHERE id = $14 RETURNING *
      `, [
        name_ar, name_en, cr_number, vat_number, address, phone, email,
        r2_account_id || null, r2_endpoint || null, r2_bucket_name || null,
        r2_access_key_id || null, r2_secret_access_key || null,
        r2_backup_interval_hours === undefined || r2_backup_interval_hours === '' ? 8 : Number(r2_backup_interval_hours),
        companyId
      ]);
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
