import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

// Run schema creation only once per cold start, not on every request
let schemaEnsured = false;

async function ensurePettyCashSchema() {
  if (schemaEnsured) return;
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
    schemaEnsured = true;
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

    // Run both queries in parallel instead of sequentially
    const [custodiesRes, claimsRes] = await Promise.all([
      query(
        // Use a single LEFT JOIN aggregation instead of correlated subqueries for each row
        `SELECT
            pcc.*,
            COALESCE(agg.total_spent, 0) AS amount_spent,
            (pcc.amount_given - COALESCE(agg.total_spent, 0)) AS amount_remaining,
            e.full_name AS engineer_name,
            p.name AS project_name
          FROM petty_cash_custodies pcc
          LEFT JOIN employees e ON e.id = pcc.engineer_id
          LEFT JOIN projects p ON p.id = pcc.project_id
          LEFT JOIN (
            SELECT
              custody_id,
              engineer_id,
              SUM(amount) AS total_spent
            FROM petty_cash_claims
            WHERE status = 'approved'
            GROUP BY custody_id, engineer_id
          ) agg ON (agg.custody_id = pcc.id OR (agg.custody_id IS NULL AND agg.engineer_id = pcc.engineer_id))
          ${engineerId ? 'WHERE pcc.engineer_id = $1' : ''}
          ORDER BY pcc.issue_date DESC, pcc.created_at DESC`,
        engineerId ? [engineerId] : []
      ),
      query(
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
          ORDER BY pcm.claim_date DESC, pcm.created_at DESC`,
        projectId ? [projectId] : []
      )
    ]);

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

    const cleanUuid = (val: any) => (val && typeof val === 'string' && val.trim() !== '' ? val : null);
    const cleanStr = (val: any) => (val && typeof val === 'string' && val.trim() !== '' ? val : null);

    if (type === 'issue_custody') {
      const cleanEngineerId = cleanUuid(engineer_id);
      const cleanProjectId = cleanUuid(project_id);
      if (!cleanEngineerId || !amount || Number(amount) <= 0) {
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
        [custodyNumber, cleanEngineerId, cleanProjectId, amount, issue_date, cleanStr(notes)]
      );

      return NextResponse.json({
        data: res.rows[0],
        message: `تم تسليم عُهدة نقدية للمهندس بقيمة (${Number(amount).toLocaleString('ar-EG')}) بنجاح.`
      }, { status: 201 });

    } else if (type === 'submit_claim') {
      const cleanEngineerId = cleanUuid(engineer_id);
      const cleanProjectId = cleanUuid(project_id);
      let cleanCustodyId = cleanUuid(custody_id);

      if (!cleanEngineerId || !description || !amount || Number(amount) <= 0) {
        return NextResponse.json({ error: 'إجبارياً: اختيار المهندس وتفاصيل المبلغ والوصف للفاتورة' }, { status: 400 });
      }

      // Auto-link custody_id if missing by finding engineer's custody
      if (!cleanCustodyId && cleanEngineerId) {
        const activeCustRes = await query(
          `SELECT id FROM petty_cash_custodies WHERE engineer_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [cleanEngineerId]
        );
        if (activeCustRes.rows.length > 0) {
          cleanCustodyId = activeCustRes.rows[0].id;
        }
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
          cleanCustodyId,
          cleanEngineerId,
          cleanProjectId,
          claimNumber,
          claim_date,
          category,
          description,
          amount,
          cleanStr(receipt_image_url),
          cleanStr(notes)
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
    const { type, claim_id, action, notes } = body;

    // --- EDIT CUSTODY ---
    if (type === 'edit_custody') {
      const { id, engineer_id, project_id, amount_given, issue_date, notes: custNotes } = body;
      if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });
      const cleanUuid = (val: any) => (val && typeof val === 'string' && val.trim() !== '' ? val : null);
      await query(
        `UPDATE petty_cash_custodies
         SET engineer_id = COALESCE($1, engineer_id),
             project_id = $2,
             amount_given = COALESCE($3, amount_given),
             issue_date = COALESCE($4, issue_date),
             notes = $5
         WHERE id = $6`,
        [cleanUuid(engineer_id), cleanUuid(project_id), amount_given ? Number(amount_given) : null, issue_date || null, custNotes ?? null, id]
      );
      return NextResponse.json({ message: 'تم تعديل بيانات العُهدة النقدية بنجاح.' });
    }

    // --- EDIT CLAIM ---
    if (type === 'edit_claim') {
      const { id, engineer_id, project_id, category, description, amount, claim_date, notes: claimNotes, receipt_image_url } = body;
      if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });
      const cleanUuid = (val: any) => (val && typeof val === 'string' && val.trim() !== '' ? val : null);

      let updateReceiptClause = '';
      const params: any[] = [
        cleanUuid(engineer_id),
        cleanUuid(project_id),
        category || null,
        description || null,
        amount ? Number(amount) : null,
        claim_date || null,
        claimNotes ?? null
      ];

      if (receipt_image_url !== undefined) {
        const imgVal = (typeof receipt_image_url === 'string' && receipt_image_url.trim() !== '') ? receipt_image_url : null;
        params.push(imgVal);
        updateReceiptClause = `, receipt_image_url = $${params.length}`;
      }

      params.push(id);
      const idParamIdx = params.length;

      await query(
        `UPDATE petty_cash_claims
         SET engineer_id = COALESCE($1, engineer_id),
             project_id = $2,
             category = COALESCE($3, category),
             description = COALESCE($4, description),
             amount = COALESCE($5, amount),
             claim_date = COALESCE($6, claim_date),
             notes = $7
             ${updateReceiptClause}
         WHERE id = $${idParamIdx}`,
        params
      );
      return NextResponse.json({ message: 'تم تعديل بيانات الفاتورة بنجاح.' });
    }

    // --- APPROVE / REJECT CLAIM ---
    if (!claim_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'claim_id و action مطلوبان بشكل صحيح' }, { status: 400 });
    }

    const userRole = request.headers.get('x-user-role') || body.user_role || '';
    if (userRole && userRole !== 'admin' && userRole !== 'manager') {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية الاعتماد. الاعتماد والموافقة هي صلاحية حصرية لمدير النظام والمدير العام فقط.' },
        { status: 403 }
      );
    }

    const claimRes = await query(`SELECT * FROM petty_cash_claims WHERE id = $1`, [claim_id]);
    if (claimRes.rows.length === 0) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    }
    const claim = claimRes.rows[0];

    if (action === 'approve') {
      let targetCustodyId = claim.custody_id;
      if (!targetCustodyId && claim.engineer_id) {
        const activeCustRes = await query(
          `SELECT id FROM petty_cash_custodies WHERE engineer_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [claim.engineer_id]
        );
        if (activeCustRes.rows.length > 0) {
          targetCustodyId = activeCustRes.rows[0].id;
        }
      }

      // Run update + expense insert in parallel where possible
      await query(
        `UPDATE petty_cash_claims
         SET status = 'approved', approval_date = CURRENT_DATE, custody_id = COALESCE($1, custody_id), notes = COALESCE($2, notes)
         WHERE id = $3`,
        [targetCustodyId ?? null, notes ?? null, claim_id]
      );

      const updatePromises: Promise<any>[] = [];

      if (targetCustodyId) {
        updatePromises.push(query(
          `UPDATE petty_cash_custodies
           SET amount_spent = COALESCE((SELECT SUM(amount) FROM petty_cash_claims WHERE custody_id = $1 AND status = 'approved'), 0)
           WHERE id = $1`,
          [targetCustodyId]
        ));
      }

      if (claim.project_id) {
        updatePromises.push(
          query(`SELECT full_name FROM employees WHERE id = $1`, [claim.engineer_id]).then(engRes => {
            const engName = engRes.rows[0]?.full_name || 'مهندس الموقع';
            return query(
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
          })
        );
      }

      await Promise.all(updatePromises);
      return NextResponse.json({ message: `تم اعتماد فاتورة العُهدة وترحيل التكلفة المباشرة لميزانية المشروع بنجاح.` });

    } else {
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
