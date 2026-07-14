import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('project_id') ?? '';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const projectFilter = projectId
      ? `AND project_id = $${paramIndex++}`
      : '';
    if (projectId) params.push(projectId);

    // IPC inflows for last 12 months
    const ipcResult = await query(
      `SELECT
          TO_CHAR(DATE_TRUNC('month', ipc_date), 'YYYY-MM') AS month,
          SUM(net_amount) AS total_inflow,
          COUNT(*) AS ipc_count
        FROM client_ipc
        WHERE ipc_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
          AND status IN ('approved', 'paid')
          ${projectFilter}
        GROUP BY DATE_TRUNC('month', ipc_date)
        ORDER BY DATE_TRUNC('month', ipc_date)`,
      params
    );

    // Reset params for expenses query
    const expenseParams: unknown[] = [];
    let expenseParamIndex = 1;
    const expenseProjectFilter = projectId
      ? `AND project_id = $${expenseParamIndex++}`
      : '';
    if (projectId) expenseParams.push(projectId);

    // Expense outflows for last 12 months
    const expenseResult = await query(
      `SELECT
          TO_CHAR(DATE_TRUNC('month', expense_date), 'YYYY-MM') AS month,
          SUM(amount) AS total_outflow,
          COUNT(*) AS expense_count
        FROM project_expenses
        WHERE expense_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
          ${expenseProjectFilter}
        GROUP BY DATE_TRUNC('month', expense_date)
        ORDER BY DATE_TRUNC('month', expense_date)`,
      expenseParams
    );

    // Build month map for last 12 months
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const ipcMap = new Map<string, any>(ipcResult.rows.map((r: any) => [r.month, r]));
    const expenseMap = new Map<string, any>(expenseResult.rows.map((r: any) => [r.month, r]));

    const cashflow = months.map((month) => {
      const inflow = parseFloat(ipcMap.get(month)?.total_inflow ?? '0');
      const outflow = parseFloat(expenseMap.get(month)?.total_outflow ?? '0');
      return {
        month,
        total_inflow: inflow,
        ipc_count: parseInt(ipcMap.get(month)?.ipc_count ?? '0', 10),
        total_outflow: outflow,
        expense_count: parseInt(expenseMap.get(month)?.expense_count ?? '0', 10),
        net_cashflow: inflow - outflow,
        cumulative_net: 0, // filled below
      };
    });

    // Compute cumulative net
    let cumulative = 0;
    cashflow.forEach((row) => {
      cumulative += row.net_cashflow;
      row.cumulative_net = cumulative;
    });

    const summary = {
      total_inflow: cashflow.reduce((s, r) => s + r.total_inflow, 0),
      total_outflow: cashflow.reduce((s, r) => s + r.total_outflow, 0),
      net_cashflow: cashflow.reduce((s, r) => s + r.net_cashflow, 0),
    };

    return NextResponse.json({ data: cashflow, summary });
  } catch (error) {
    console.error('[GET /api/finance/cashflow]', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash flow data' },
      { status: 500 }
    );
  }
}
