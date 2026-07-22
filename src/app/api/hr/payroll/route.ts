import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

// Helper function to calculate and insert payroll for a single employee
async function processSingleEmployee({
  empId,
  month,
  year,
  customDeductions = 0,
  overtime_amount = 0,
  status = 'draft',
  payment_date = null,
  notes = null,
  recalculate = false,
}: {
  empId: string;
  month: number;
  year: number;
  customDeductions?: number;
  overtime_amount?: number;
  status?: string;
  payment_date?: string | null;
  notes?: string | null;
  recalculate?: boolean;
}) {
  // Check existing payroll entry: auto-update draft records on every fetch/calculation
  const existing = await query(
    'SELECT id, status FROM payroll WHERE employee_id = $1 AND month = $2 AND year = $3',
    [empId, month, year]
  );
  if (existing.rows.length > 0) {
    if (existing.rows[0].status === 'draft') {
      await query('DELETE FROM payroll WHERE id = $1', [existing.rows[0].id]);
    } else {
      return null; // Skip locked records (approved/paid)
    }
  }

  // Days in month calculation (e.g. 31 days for July, 30 for June, 28/29 for Feb)
  const daysInMonth = new Date(year, month, 0).getDate();

  // Fetch employee salary info
  const empRes = await query(
    'SELECT base_salary, housing_allowance, transport_allowance, other_allowances FROM employees WHERE id = $1',
    [empId]
  );
  if (empRes.rows.length === 0) return null;
  const salaryData = empRes.rows[0];

  // Query actual recorded attendance days for this employee in this month
  let attendedDays = 0;
  try {
    const attCountRes = await query(
      `SELECT COUNT(DISTINCT attendance_date) AS attended_count 
       FROM attendance_records 
       WHERE employee_id = $1 
         AND EXTRACT(MONTH FROM attendance_date) = $2 
         AND EXTRACT(YEAR FROM attendance_date) = $3
         AND attendance_type IN ('present', 'late', 'half_day', 'leave', 'holiday', 'rest_day')`,
      [empId, month, year]
    );

    attendedDays = Number(attCountRes.rows[0]?.attended_count || 0);
  } catch (err) {
    console.warn('Attendance days calculation skipped:', err);
  }

  // 4 days paid leave added per month condition:
  // Included ONLY if status is approved/paid OR if it's a past month OR if current month reaches the start of the last day (currentDay >= daysInMonth)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth);
  const isLastDayOrLaterOfCurrentMonth = (year === currentYear && month === currentMonth && currentDay >= daysInMonth);
  const isApprovedOrPaid = status === 'approved' || status === 'paid';

  const shouldInclude4PaidLeaves = isApprovedOrPaid || isPastMonth || isLastDayOrLaterOfCurrentMonth;
  const paidLeaveDays = shouldInclude4PaidLeaves ? 4 : 0;

  // Deduction rule: 2 days deducted for every 1 day of absence
  const absentDaysCount = Math.max(0, daysInMonth - attendedDays);
  const absentPenaltyDays = absentDaysCount * 2;
  const paidDays = Math.min(daysInMonth, Math.max(0, daysInMonth - absentPenaltyDays + paidLeaveDays));
  const absentDays = absentDaysCount;

  // Daily rate & earned base salary
  const fullBaseSalary = Number(salaryData.base_salary || 0);
  const dailyRate = daysInMonth > 0 ? fullBaseSalary / daysInMonth : 0;
  const earnedBaseSalary = Math.round(dailyRate * paidDays * 100) / 100;

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
    loanDeduction = Math.min(Number(loan.monthly_deduction), Math.max(0, remaining));
  }

  // Query approved overtime requests
  let reqOvertimeAmount = 0;
  try {
    const overtimeReqRes = await query(
      `SELECT COALESCE(SUM(hours_requested), 0) AS req_hours 
       FROM overtime_requests 
       WHERE employee_id = $1 AND status = 'approved' AND EXTRACT(MONTH FROM overtime_date) = $2 AND EXTRACT(YEAR FROM overtime_date) = $3`,
      [empId, month, year]
    );
    const reqHours = Number(overtimeReqRes.rows[0]?.req_hours || 0);
    const hourlyRate = (fullBaseSalary / 240) * 1.5;
    reqOvertimeAmount = reqHours * hourlyRate;
  } catch (err) {
    console.warn('Overtime calculation skipped or table missing:', err);
  }

  // Query attendance overtime hours
  let attOvertimeAmount = 0;
  try {
    const attOvertimeRes = await query(
      `SELECT COALESCE(SUM(overtime_hours), 0) AS att_hours 
       FROM attendance_records 
       WHERE employee_id = $1 AND EXTRACT(MONTH FROM attendance_date) = $2 AND EXTRACT(YEAR FROM attendance_date) = $3`,
      [empId, month, year]
    );
    const attOvertimeHours = Number(attOvertimeRes.rows[0]?.att_hours || 0);
    const hourlyRate = (fullBaseSalary / 240) * 1.5;
    attOvertimeAmount = attOvertimeHours * hourlyRate;
  } catch (err) {
    console.warn('Attendance overtime calculation skipped:', err);
  }

  const calculatedOvertime = reqOvertimeAmount + attOvertimeAmount;
  const finalOvertime = Number(overtime_amount) > 0 ? Number(overtime_amount) : calculatedOvertime;

  const finalDeductions = Number(customDeductions) + loanDeduction;
  const grossSalary =
    earnedBaseSalary +
    (Number(salaryData.housing_allowance) ?? 0) +
    (Number(salaryData.transport_allowance) ?? 0) +
    (Number(salaryData.other_allowances) ?? 0) +
    finalOvertime;
  const netSalary = grossSalary - finalDeductions;

  const result = await query(
    `INSERT INTO payroll (
        employee_id, month, year, working_days, actual_days, absent_days,
        base_salary, housing_allowance, transport_allowance, other_allowances,
        overtime_amount, deductions, net_salary, status, payment_date, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
    [
      empId,
      month,
      year,
      daysInMonth,
      paidDays,
      absentDays,
      earnedBaseSalary,
      salaryData.housing_allowance ?? 0,
      salaryData.transport_allowance ?? 0,
      salaryData.other_allowances ?? 0,
      finalOvertime,
      finalDeductions,
      netSalary,
      status,
      payment_date ?? null,
      notes ?? null,
    ]
  );
  return result.rows[0];
}

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

    // Auto-generate payroll records for active employees if month and year are specified
    if (month && year) {
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      if (!isNaN(monthNum) && !isNaN(yearNum)) {
        const activeEmps = await query("SELECT id FROM employees WHERE status = 'active'");
        for (const emp of activeEmps.rows) {
          await processSingleEmployee({
            empId: emp.id,
            month: monthNum,
            year: yearNum,
          });
        }
      }
    }

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
          p.working_days,
          p.actual_days,
          p.absent_days,
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
          p.created_at
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
      recalculate = false,
    } = body;

    if (!month || !year) {
      return NextResponse.json(
        { error: 'month and year are required' },
        { status: 400 }
      );
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (employee_id) {
      const record = await processSingleEmployee({
        empId: employee_id,
        month: monthNum,
        year: yearNum,
        customDeductions: deductions,
        overtime_amount,
        status,
        payment_date,
        notes,
        recalculate,
      });
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
        const rec = await processSingleEmployee({
          empId: emp.id,
          month: monthNum,
          year: yearNum,
          customDeductions: 0,
          overtime_amount: 0,
          status,
          payment_date,
          notes,
          recalculate,
        });
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


