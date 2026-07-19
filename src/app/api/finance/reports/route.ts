import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('from');
    const endDate = searchParams.get('to');
    const projectId = searchParams.get('project_id');

    let dateWhereExpense = '';
    let dateWhereIpc = '';
    let dateWhereSubIpc = '';
    let dateWhereDebt = '';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (projectId && projectId !== 'all') {
      dateWhereExpense += ` WHERE pe.project_id = $${paramIndex}`;
      dateWhereIpc += ` WHERE ci.project_id = $${paramIndex}`;
      dateWhereSubIpc += ` WHERE si.project_id = $${paramIndex}`;
      dateWhereDebt += ` WHERE cd.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    if (startDate) {
      const prefix = params.length > 0 ? ' AND' : ' WHERE';
      dateWhereExpense += `${prefix} pe.expense_date >= $${paramIndex}`;
      dateWhereIpc += `${prefix} ci.ipc_date >= $${paramIndex}`;
      dateWhereSubIpc += `${prefix} si.ipc_date >= $${paramIndex}`;
      dateWhereDebt += `${prefix} cd.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      const prefix = params.length > 0 ? ' AND' : ' WHERE';
      dateWhereExpense += `${prefix} pe.expense_date <= $${paramIndex}`;
      dateWhereIpc += `${prefix} ci.ipc_date <= $${paramIndex}`;
      dateWhereSubIpc += `${prefix} si.ipc_date <= $${paramIndex}`;
      dateWhereDebt += `${prefix} cd.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const [expensesRes, clientIpcsRes, subIpcsRes, debtsRes] = await Promise.all([
      query(`
        SELECT pe.id, pe.expense_date as date, pe.amount, pe.category, pe.description, pe.supplier, p.name as project_name, 'expense' as type
        FROM project_expenses pe
        LEFT JOIN projects p ON p.id = pe.project_id
        ${dateWhereExpense}
        ORDER BY pe.expense_date DESC
      `, params),

      query(`
        SELECT ci.id, ci.ipc_date as date, ci.net_payable as amount, ci.ipc_number, ci.status, p.name as project_name, 'revenue' as type
        FROM client_ipc ci
        LEFT JOIN projects p ON p.id = ci.project_id
        ${dateWhereIpc}
        ORDER BY ci.ipc_date DESC
      `, params),

      query(`
        SELECT si.id, si.ipc_date as date, si.net_payable as amount, si.ipc_number, si.status, s.name as subcontractor_name, p.name as project_name, 'subcontractor' as type
        FROM subcontractor_ipc si
        LEFT JOIN projects p ON p.id = si.project_id
        LEFT JOIN subcontractors s ON s.id = si.subcontractor_id
        ${dateWhereSubIpc}
        ORDER BY si.ipc_date DESC
      `, params),

      query(`
        SELECT cd.id, cd.created_at as date, cd.amount, cd.creditor_name, cd.debt_type, cd.status, 'debt' as type
        FROM company_debts cd
        ${dateWhereDebt}
        ORDER BY cd.created_at DESC
      `, params)
    ]);

    const expenses = expensesRes.rows;
    const clientIpcs = clientIpcsRes.rows;
    const subIpcs = subIpcsRes.rows;
    const debts = debtsRes.rows;

    const totalRevenues = clientIpcs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalSubcontractor = subIpcs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalDebts = debts.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const netCashFlow = totalRevenues - (totalExpenses + totalSubcontractor);

    // Merge transactions sorted by date
    const transactions = [
      ...clientIpcs.map(i => ({ ...i, title: `مستخلص مالك #${i.ipc_number} (${i.project_name || 'مشروع'})`, category: 'إيراد / مستخلص مالك' })),
      ...expenses.map(e => ({ ...e, title: e.description || `مصروف: ${e.category}`, category: e.category })),
      ...subIpcs.map(s => ({ ...s, title: `مستخلص مقاول #${s.ipc_number} - ${s.subcontractor_name || ''}`, category: 'مستخلص مقاول باطن' })),
      ...debts.map(d => ({ ...d, title: `ديون/التزام: ${d.creditor_name}`, category: 'ديون والتزامات' }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      summary: {
        total_revenues: totalRevenues,
        total_expenses: totalExpenses,
        total_subcontractor: totalSubcontractor,
        total_debts: totalDebts,
        net_cash_flow: netCashFlow,
        transaction_count: transactions.length
      },
      transactions
    });

  } catch (error: any) {
    console.error('Financial report error:', error);
    return NextResponse.json({ error: error.message || 'فشل توليد التقرير المالي' }, { status: 500 });
  }
}
