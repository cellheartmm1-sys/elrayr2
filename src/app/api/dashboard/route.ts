import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const [projectsResult, employeesResult, maintenanceResult, expensesResult, ipcResult, laborResult, documentsResult, overtimeResult] = await Promise.all([
      query(`SELECT status, COUNT(*) as count, SUM(contract_value) as total_value FROM projects GROUP BY status`),
      query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'active' THEN 1 END) as active FROM employees`),
      query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'active' THEN 1 END) as active FROM maintenance_contracts`),
      query(`SELECT COALESCE(SUM(amount), 0) as total FROM project_expenses WHERE EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM NOW())`),
      query(`SELECT COALESCE(SUM(net_payable), 0) as total FROM client_ipc WHERE status IN ('client_approved','paid') AND EXTRACT(YEAR FROM ipc_date) = EXTRACT(YEAR FROM NOW())`),
      query(`SELECT COUNT(*) as total_tickets, COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets FROM fault_tickets`),
      query(`SELECT COUNT(*) as expiring FROM employee_documents WHERE expiry_date <= NOW() + INTERVAL '30 days' AND expiry_date > NOW()`),
      query(`SELECT COUNT(*) as pending FROM overtime_requests WHERE status = 'pending'`),
    ]);

    // Recent projects
    const recentProjects = await query(`
      SELECT p.*, 
        COALESCE((SELECT AVG(pp.actual_percentage) FROM project_progress pp WHERE pp.project_id = p.id), 0) as avg_progress
      FROM projects p 
      ORDER BY p.created_at DESC 
      LIMIT 5
    `);

    // Monthly expenses trend (last 6 months)
    const expensesTrend = await query(`
      SELECT 
        TO_CHAR(expense_date, 'YYYY-MM') as month,
        SUM(amount) as total
      FROM project_expenses
      WHERE expense_date >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month
    `);

    // Project progress summary
    const projectProgress = await query(`
      SELECT p.name, p.code,
        COALESCE(AVG(pp.actual_percentage), 0) as actual,
        COALESCE(AVG(pp.planned_percentage), 0) as planned
      FROM projects p
      LEFT JOIN project_progress pp ON pp.project_id = p.id
      WHERE p.status = 'active'
      GROUP BY p.id, p.name, p.code
      LIMIT 5
    `);

    // Labor cost by project
    const laborCost = await query(`SELECT * FROM labor_cost_by_project LIMIT 5`);

    // Recent fault tickets
    const recentTickets = await query(`
      SELECT * FROM fault_tickets ORDER BY created_at DESC LIMIT 5
    `);

    return NextResponse.json({
      stats: {
        projects: projectsResult.rows,
        employees: employeesResult.rows[0],
        maintenance: maintenanceResult.rows[0],
        monthlyExpenses: expensesResult.rows[0],
        yearlyRevenue: ipcResult.rows[0],
        faultTickets: laborResult.rows[0],
        expiringDocs: documentsResult.rows[0],
        pendingOvertime: overtimeResult.rows[0],
      },
      recentProjects: recentProjects.rows,
      expensesTrend: expensesTrend.rows,
      projectProgress: projectProgress.rows,
      laborCost: laborCost.rows,
      recentTickets: recentTickets.rows,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
