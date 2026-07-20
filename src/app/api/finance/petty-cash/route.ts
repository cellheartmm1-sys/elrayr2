import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

async function ensurePettyCashSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS petty_cash_custodies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        custody_number TEXT UNIQUE NOT NULL,
        engineer_id UUID NOT NULL REFERENCES employees(id),
        project_id UUID REFERENCES projects(id),
        amount_given NUMERIC(15,2) NOT NULL DEFAULT 0,
        amount_spent NUMERIC(15,2) DEFAULT 0,
        issue_date DATE DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'settled', 'closed')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS petty_cash_claims (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        custody_id UUID REFERENCES petty_cash_custodies(id) ON DELETE SET NULL,
        engineer_id UUID REFERENCES employees(id),
        project_id UUID REFERENCES projects(id),
        claim_number TEXT UNIQUE NOT NULL,
        claim_date DATE DEFAULT CURRENT_DATE,
        category TEXT DEFAULT 'material' CHECK (category IN ('material','labor','subcontractor','equipment','transport','overhead','other')),
        description TEXT NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        receipt_image_url TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        approved_by UUID REFERENCES users(id),
        approval_date DATE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error('Failed to ensure petty cash schema:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensurePettyCashSchema();
    const { searchParams } = request.nextUrl;
    const engineerId = searchParams.get('engineer_id') ?? '';
    const projectId = searchParams.get('project_id') ?? '';
    const view = searchParams.get('view') ?? 'all'; // 'custodies', 'claims', 'all'

    const custodiesRes = await query(
      `SELECT
          pcc.*,
          (pcc.amount_given - pcc.amount_spent) AS amount_remaining,
          e.full_name AS engineer_name,
          p.name AS project_name
        FROM petty_cash_custodies pcc
        LEFT JOIN employees e ON e.id = pcc.engineer_id
        LEFT JOIN projects p ON p.id = pcc.project_id
        ${engineerId ? 'WHERE pcc.engineer_id = $1' : ''}
        ORDER BY pcc.issue_date DESC, pcc.created_at DESC`,
      engineerId ? [engineerId] : []
    );

    const claimsRes = await query(
      `SELECT
          pcm.*,
          e.full_name AS engineer_name,
          p.name AS project_name,
          pcc.custody_number
        FROM petty_cash_claims pcm
        LEFT JOIN employees e ON e.id = pcm.engineer_id
        LEFT JOIN projects p ON p.id = pcm.project_id
        LEFT JOIN petty_cash_custodies pcc ON pcc.id = pcm.custody_id
        ${projectId ? 'WHERE pcm.project_id = $1' : ''}
        ORDER BY pcm.claim_date DESC, pcm.created_at DESC`
    );

    return NextResponse.json({
      custodies: custodiesRes.rows,
      claims: claimsRes.rows
    });
  } catch (error: any) {
    console.error('[GET /api/finance/petty-cash]', error);
    return NextResponse.json({ error: error?.message || 'فشل جلب بيانت العُهَد النقدية' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensurePettyCashSchema();
    const body = await request.json();
    const {
      type, // 'issue_custody' | 'submit_claim'
      engineer_id,
      project_id,
      amount,
      issue_date = new Date().toISOString().split('T')[0],
      claim_date = new Date().toISOString().split('T')[0],
      category = 'material',
      description,
      receipt_image_url,
      custody_id,
      notes
    } = body;

    if (type === 'issue_custody') {
      if (!engineer_id || !amount || Number(amount) <= 0) {
        return NextResponse.json({ error: 'إجبارياً: اختيار المهندس وإدخال قيمة العُهدة النقدية' }, { status: 400 });
      }

      // Generate Custody Number CUST-1001
      const lastRes = await query(`SELECT custody_number FROM petty_cash_custodies WHERE custody_number LIKE 'CUST-%' ORDER BY created_at DESC LIMIT 1`);
      let nextNum = 1001;
      if (lastRes.rows.length > 0) {
        const match = lastRes.rows[0].custody_number.match(/\d+/);
        if (match) nextNum = parseInt(match[0], 10) + 1;
      }
      const custodyNumber = `CUST-${nextNum}`;

      const res = await query(
        `INSERT INTO petty_cash_custodies (custody_number, engineer_id, project_id, amount_given, issue_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [custodyNumber, engineer_id, project_id ?? null, amount, issue_date, notes ?? null]
      );

      return NextResponse.json({
        data: res.rows[0],
        message: `تم تسليم عُهدة نقدية للمهندس بقيمة (${Number(amount).toLocaleString('ar-EG')}) بنجاح.`
      }, { status: 201 });

    } else if (type === 'submit_claim') {
      if (!engineer_id || !description || !amount || Number(amount) <= 0) {
        return NextResponse.json({ error: 'إجبارياً: اختيار المهندس وتفاصيل المبلغ والوصف للفاتورة' }, { status: 400 });
      }

      // Generate Claim Number CLM-1001
      const lastRes = await query(`SELECT claim_number FROM petty_cash_claims WHERE claim_number LIKE 'CLM-%' ORDER BY created_at DESC LIMIT 1`);
      let nextNum = 1001;
      if (lastRes.rows.length > 0) {
        const match = lastRes.rows[0].claim_number.match(/\d+/);
        if (match) nextNum = parseInt(match[0], 10) + 1;
      }
      const claimNumber = `CLM-${nextNum}`;

      const res = await query(
        `INSERT INTO petty_cash_claims (
          custody_id, engineer_id, project_id, claim_number, claim_date,
          category, description, amount, receipt_image_url, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending') RETURNING *`,
        [
          custody_id ?? null,
          engineer_id,
          project_id ?? null,
          claimNumber,
          claim_date,
          category,
          description,
          amount,
          receipt_image_url ?? null,
          notes ?? null
        ]
      );

      return NextResponse.json({
        data: res.rows[0],
        message: `تم رفع فاتورة العُهدة (${claimNumber}) وإرسالها لدورة الاعتماد بنجاح.`
      }, { status: 201 });

    } else {
      return NextResponse.json({ error: 'نوع العملية غير معروف' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[POST /api/finance/petty-cash]', error);
    return NextResponse.json({ error: error?.message || 'فشل معالجة العُهدة النقدية' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensurePettyCashSchema();
    const body = await request.json();
    const { claim_id, action, notes } = body; // action: 'approve' | 'reject'

    if (!claim_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'claim_id و action مطلوبان بشكل صحيح' }, { status: 400 });
    }

    const claimRes = await query(`SELECT * FROM petty_cash_claims WHERE id = $1`, [claim_id]);
    if (claimRes.rows.length === 0) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    }
    const claim = claimRes.rows[0];

    if (action === 'approve') {
      // 1. Update claim status
      await query(
        `UPDATE petty_cash_claims
         SET status = 'approved', approval_date = CURRENT_DATE, notes = COALESCE($1, notes)
         WHERE id = $2`,
        [notes ?? null, claim_id]
      );

      // 2. Update custody spent amount if linked
      if (claim.custody_id) {
        await query(
          `UPDATE petty_cash_custodies
           SET amount_spent = amount_spent + $1
           WHERE id = $2`,
          [claim.amount, claim.custody_id]
        );
      }

      // 3. Auto-post Direct Expense to project_expenses if project_id exists
      if (claim.project_id) {
        const engRes = await query(`SELECT full_name FROM employees WHERE id = $1`, [claim.engineer_id]);
        const engName = engRes.rows[0]?.full_name || 'مهندس الموقع';

        await query(
          `INSERT INTO project_expenses (project_id, expense_date, category, description, amount, supplier, invoice_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            claim.project_id,
            claim.claim_date,
            claim.category || 'material',
            `تصفية عُهدة نقدية: ${claim.description} (بواسطة ${engName})`,
            claim.amount,
            `عُهدة المهندس: ${engName}`,
            claim.claim_number
          ]
        );
      }

      return NextResponse.json({ message: `تم اعتماد فاتورة العُهدة وترحيل التكلفة المباشرة لميزانية المشروع بنجاح.` });

    } else {
      // Reject claim
      await query(
        `UPDATE petty_cash_claims SET status = 'rejected', notes = COALESCE($1, notes) WHERE id = $2`,
        [notes ?? null, claim_id]
      );
      return NextResponse.json({ message: `تم رفض فاتورة العُهدة.` });
    }

  } catch (error: any) {
    console.error('[PUT /api/finance/petty-cash]', error);
    return NextResponse.json({ error: error?.message || 'فشل تحديث فاتورة العُهدة' }, { status: 500 });
  }
}
