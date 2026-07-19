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

    // IPC inflows for last 12 months (client_ipc uses net_payable)
    const ipcResult = await query(
      `SELECT
          TO_CHAR(DATE_TRUNC('month', ipc_date), 'YYYY-MM') AS month,
          SUM(COALESCE(net_payable, 0)) AS total_inflow,
          COUNT(*) AS ipc_count
        FROM client_ipc
        WHERE ipc_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
          ${projectFilter}
        GROUP BY DATE_TRUNC('month', ipc_date)
        ORDER BY DATE_TRUNC('month', ipc_date)`,
      params
    );

    // Expense outflows for last 12 months (expenses + sub_ipc + payroll)
    const expenseParams: unknown[] = [];
    let expenseParamIndex = 1;
    const expenseProjectFilter = projectId
      ? `AND project_id = $${expenseParamIndex++}`
      : '';
    if (projectId) expenseParams.push(projectId);

    const expenseResult = await query(
      `SELECT
          month,
          SUM(outflow) AS total_outflow,
          SUM(cnt) AS expense_count
        FROM (
          SELECT
            TO_CHAR(DATE_TRUNC('month', expense_date), 'YYYY-MM') AS month,
            SUM(amount) AS outflow,
            COUNT(*) AS cnt
          FROM project_expenses
          WHERE expense_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
            ${expenseProjectFilter}
          GROUP BY DATE_TRUNC('month', expense_date)

          UNION ALL

          SELECT
            TO_CHAR(DATE_TRUNC('month', ipc_date), 'YYYY-MM') AS month,
            SUM(COALESCE(net_payable, 0)) AS outflow,
            COUNT(*) AS cnt
          FROM subcontractor_ipc
          WHERE ipc_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
            ${expenseProjectFilter}
          GROUP BY DATE_TRUNC('month', ipc_date)

          UNION ALL

          SELECT
            TO_CHAR(MAKE_DATE(year, month, 1), 'YYYY-MM') AS month,
            SUM(COALESCE(net_salary, 0)) AS outflow,
            COUNT(*) AS cnt
          FROM payroll
          WHERE MAKE_DATE(year, month, 1) >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
          GROUP BY year, month
        ) combined
        GROUP BY month
        ORDER BY month`,
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
