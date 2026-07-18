import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const month = searchParams.get('month') ?? '';
    const year = searchParams.get('year') ?? '';
    const status = searchParams.get('status') ?? '';
    const employeeId = searchParams.get('employee_id') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (month) {
      conditions.push(`p.month = $${paramIndex}`);
      params.push(parseInt(month, 10));
      paramIndex++;
    }

    if (year) {
      conditions.push(`p.year = $${paramIndex}`);
      params.push(parseInt(year, 10));
      paramIndex++;
    }

    if (status) {
      conditions.push(`p.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (employeeId) {
      conditions.push(`p.employee_id = $${paramIndex}`);
      params.push(employeeId);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM payroll p ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT
          p.id,
          p.employee_id,
          e.employee_number,
          e.full_name AS employee_name,
          e.job_title,
          d.name AS department_name,
          p.month,
          p.year,
          p.base_salary,
          p.housing_allowance,
          p.transport_allowance,
          p.other_allowances,
          p.overtime_amount,
          p.deductions,
          p.net_salary,
          p.status,
          p.payment_date,
          p.notes,
          p.created_at,
          p.updated_at
        FROM payroll p
        JOIN employees e ON e.id = p.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        ${where}
        ORDER BY p.year DESC, p.month DESC, e.full_name ASC
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
    console.error('[GET /api/hr/payroll]', error);
    return NextResponse.json(
      { error: 'Failed to fetch payroll records' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      month,
      year,
      base_salary,
      housing_allowance,
      transport_allowance,
      other_allowances,
      overtime_amount = 0,
      deductions = 0,
      status = 'draft',
      payment_date,
      notes,
    } = body;

    if (!month || !year) {
      return NextResponse.json(
        { error: 'month and year are required' },
        { status: 400 }
      );
    }

    // Helper function to calculate and insert payroll for a single employee
    const processSingleEmployee = async (empId: string, customDeductions = 0) => {
      // Check duplicate payroll entry
      const existing = await query(
        'SELECT id FROM payroll WHERE employee_id = $1 AND month = $2 AND year = $3',
        [empId, month, year]
      );
      if (existing.rows.length > 0) {
        return null; // Skip if already exists
      }

      // Fetch employee salary info
      const empRes = await query(
        'SELECT base_salary, housing_allowance, transport_allowance, other_allowances FROM employees WHERE id = $1',
        [empId]
      );
      if (empRes.rows.length === 0) return null;
      const salaryData = empRes.rows[0];

      // Query active loan deduction
      const activeLoanRes = await query(
        `SELECT id, monthly_deduction, amount, paid_amount FROM employee_loans 
         WHERE employee_id = $1 AND status = 'active'`,
        [empId]
      );
      let loanDeduction = 0;
      if (activeLoanRes.rows.length > 0) {
        const loan = activeLoanRes.rows[0];
        const remaining = Number(loan.amount) - Number(loan.paid_amount);
        loanDeduction = Math.min(Number(loan.monthly_deduction), remaining);

        // Deduct/Update the loan paid_amount and status immediately
        if (loanDeduction > 0) {
          const newPaid = Number(loan.paid_amount) + loanDeduction;
          const newStatus = newPaid >= Number(loan.amount) ? 'paid' : 'active';
          await query(
            `UPDATE employee_loans SET paid_amount = $1, status = $2, updated_at = NOW() WHERE id = $3`,
            [newPaid, newStatus, loan.id]
          );
        }
      }

      const finalDeductions = Number(customDeductions) + loanDeduction;
      const grossSalary =
        (Number(salaryData.base_salary) ?? 0) +
        (Number(salaryData.housing_allowance) ?? 0) +
        (Number(salaryData.transport_allowance) ?? 0) +
        (Number(salaryData.other_allowances) ?? 0) +
        Number(overtime_amount);
      const netSalary = grossSalary - finalDeductions;

      const result = await query(
        `INSERT INTO payroll (
            employee_id, month, year, base_salary, housing_allowance,
            transport_allowance, other_allowances, overtime_amount,
            deductions, net_salary, status, payment_date, notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          RETURNING *`,
        [
          empId,
          month,
          year,
          salaryData.base_salary ?? 0,
          salaryData.housing_allowance ?? 0,
          salaryData.transport_allowance ?? 0,
          salaryData.other_allowances ?? 0,
          overtime_amount,
          finalDeductions,
          netSalary,
          status,
          payment_date ?? null,
          notes ?? null,
        ]
      );
      return result.rows[0];
    };

    if (employee_id) {
      const record = await processSingleEmployee(employee_id, deductions);
      if (!record) {
        return NextResponse.json(
          { error: 'Payroll record already exists or employee not found' },
          { status: 400 }
        );
      }
      return NextResponse.json({ data: record }, { status: 201 });
    } else {
      // Bulk generation for all active employees
      const activeEmps = await query("SELECT id FROM employees WHERE status = 'active'");
      const created = [];
      for (const emp of activeEmps.rows) {
        const rec = await processSingleEmployee(emp.id, 0);
        if (rec) created.push(rec);
      }
      return NextResponse.json({ data: created, count: created.length }, { status: 201 });
    }
  } catch (error) {
    console.error('[POST /api/hr/payroll]', error);
    return NextResponse.json(
      { error: 'Failed to create payroll record' },
      { status: 500 }
    );
  }
}
