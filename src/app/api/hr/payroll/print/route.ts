import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dateMode = 'month',
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
      singleDate = '',
      startDate = '',
      endDate = '',
      empMode = 'all',
      singleEmpId = '',
      selectedEmpIds = []
    } = body;

    // 1. Fetch targeted employees
    let empQuery = `SELECT id, employee_number, full_name, job_title, base_salary, housing_allowance, transport_allowance, other_allowances, status FROM employees`;
    const empParams: any[] = [];

    if (empMode === 'single' && singleEmpId) {
      empQuery += ` WHERE id = $1`;
      empParams.push(singleEmpId);
    } else if (empMode === 'selected' && Array.isArray(selectedEmpIds) && selectedEmpIds.length > 0) {
      empQuery += ` WHERE id = ANY($1::uuid[])`;
      empParams.push(selectedEmpIds);
    } else {
      empQuery += ` WHERE status = 'active'`;
    }

    empQuery += ` ORDER BY full_name ASC`;
    const empRes = await query(empQuery, empParams);
    const employees = empRes.rows;

    let periodLabel = '';
    const payrollRows: any[] = [];

    // Summary Totals
    let totalBaseSalary = 0;
    let totalAllowances = 0;
    let totalOvertime = 0;
    let totalDeductions = 0;
    let totalNetSalary = 0;

    // 2. Process based on Date Mode
    if (dateMode === 'day' && singleDate) {
      const d = new Date(singleDate);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const daysInMonth = new Date(y, m, 0).getDate();
      periodLabel = `يوم ${singleDate}`;

      for (const emp of employees) {
        const fullBase = Number(emp.base_salary || 0);
        const dailyRate = daysInMonth > 0 ? fullBase / daysInMonth : 0;
        const dailyAllowances = (Number(emp.housing_allowance || 0) + Number(emp.transport_allowance || 0) + Number(emp.other_allowances || 0)) / daysInMonth;

        // Check attendance on singleDate
        const attRes = await query(
          `SELECT attendance_type, overtime_hours FROM attendance_records WHERE employee_id = $1 AND attendance_date = $2`,
          [emp.id, singleDate]
        );
        let attended = true;
        let overtimeHours = 0;
        if (attRes.rows.length > 0) {
          const rec = attRes.rows[0];
          attended = ['present', 'late', 'half_day', 'leave', 'holiday'].includes(rec.attendance_type);
          overtimeHours = Number(rec.overtime_hours || 0);
        }

        const paidDays = attended ? 1 : 0;
        const earnedBase = Math.round(dailyRate * paidDays * 100) / 100;
        const earnedAllowances = Math.round(dailyAllowances * paidDays * 100) / 100;
        const hourlyRate = (fullBase / 240) * 1.5;
        const overtimeAmount = Math.round(overtimeHours * hourlyRate * 100) / 100;
        const deductions = 0;
        const netSalary = Math.round((earnedBase + earnedAllowances + overtimeAmount - deductions) * 100) / 100;

        totalBaseSalary += earnedBase;
        totalAllowances += earnedAllowances;
        totalOvertime += overtimeAmount;
        totalDeductions += deductions;
        totalNetSalary += netSalary;

        payrollRows.push({
          id: emp.id,
          employee_number: emp.employee_number,
          employee_name: emp.full_name,
          job_title: emp.job_title,
          working_days: 1,
          actual_days: paidDays,
          base_salary: earnedBase,
          housing_allowance: Number(emp.housing_allowance || 0) / daysInMonth,
          transport_allowance: Number(emp.transport_allowance || 0) / daysInMonth,
          other_allowances: earnedAllowances,
          overtime_amount: overtimeAmount,
          deductions,
          net_salary: netSalary
        });
      }
    } else if (dateMode === 'range' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const rangeTime = Math.abs(end.getTime() - start.getTime());
      const rangeDays = Math.ceil(rangeTime / (1000 * 60 * 60 * 24)) + 1;
      const m = start.getMonth() + 1;
      const y = start.getFullYear();
      const daysInMonth = new Date(y, m, 0).getDate();
      periodLabel = `الفترة من ${startDate} إلى ${endDate} (${rangeDays} يوم)`;

      for (const emp of employees) {
        const fullBase = Number(emp.base_salary || 0);
        const dailyRate = daysInMonth > 0 ? fullBase / daysInMonth : 0;
        const dailyAllowances = (Number(emp.housing_allowance || 0) + Number(emp.transport_allowance || 0) + Number(emp.other_allowances || 0)) / daysInMonth;

        // Query attendance in range
        const attCountRes = await query(
          `SELECT COUNT(DISTINCT attendance_date) AS att_count, COALESCE(SUM(overtime_hours), 0) AS total_ot
           FROM attendance_records 
           WHERE employee_id = $1 AND attendance_date >= $2 AND attendance_date <= $3
             AND attendance_type IN ('present', 'late', 'half_day', 'leave', 'holiday')`,
          [emp.id, startDate, endDate]
        );

        const totalRecRes = await query(
          `SELECT COUNT(*) AS total_rec FROM attendance_records WHERE employee_id = $1 AND attendance_date >= $2 AND attendance_date <= $3`,
          [emp.id, startDate, endDate]
        );

        let attendedDays = rangeDays;
        if (Number(totalRecRes.rows[0]?.total_rec || 0) > 0) {
          attendedDays = Number(attCountRes.rows[0]?.att_count || 0);
        }

        const paidLeaveDays = Math.round(4 * (rangeDays / daysInMonth));
        const paidDays = Math.min(rangeDays, attendedDays + paidLeaveDays);
        const earnedBase = Math.round(dailyRate * paidDays * 100) / 100;
        const earnedAllowances = Math.round(dailyAllowances * paidDays * 100) / 100;

        const attOt = Number(attCountRes.rows[0]?.total_ot || 0);
        const hourlyRate = (fullBase / 240) * 1.5;
        const overtimeAmount = Math.round(attOt * hourlyRate * 100) / 100;
        const deductions = 0;
        const netSalary = Math.round((earnedBase + earnedAllowances + overtimeAmount - deductions) * 100) / 100;

        totalBaseSalary += earnedBase;
        totalAllowances += earnedAllowances;
        totalOvertime += overtimeAmount;
        totalDeductions += deductions;
        totalNetSalary += netSalary;

        payrollRows.push({
          id: emp.id,
          employee_number: emp.employee_number,
          employee_name: emp.full_name,
          job_title: emp.job_title,
          working_days: rangeDays,
          actual_days: paidDays,
          base_salary: earnedBase,
          housing_allowance: (Number(emp.housing_allowance || 0) / daysInMonth) * paidDays,
          transport_allowance: (Number(emp.transport_allowance || 0) / daysInMonth) * paidDays,
          other_allowances: earnedAllowances,
          overtime_amount: overtimeAmount,
          deductions,
          net_salary: netSalary
        });
      }
    } else {
      // Default: Month mode
      const monthNum = parseInt(String(month), 10);
      const yearNum = parseInt(String(year), 10);
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      periodLabel = `شهر ${monthNum} - سنة ${yearNum}`;

      for (const emp of employees) {
        const fullBase = Number(emp.base_salary || 0);
        const dailyRate = daysInMonth > 0 ? fullBase / daysInMonth : 0;
        const totalAllowancesEmp = Number(emp.housing_allowance || 0) + Number(emp.transport_allowance || 0) + Number(emp.other_allowances || 0);

        // Query attendance in month
        const attCountRes = await query(
          `SELECT COUNT(DISTINCT attendance_date) AS att_count, COALESCE(SUM(overtime_hours), 0) AS total_ot
           FROM attendance_records 
           WHERE employee_id = $1 AND EXTRACT(MONTH FROM attendance_date) = $2 AND EXTRACT(YEAR FROM attendance_date) = $3
             AND attendance_type IN ('present', 'late', 'half_day', 'leave', 'holiday')`,
          [emp.id, monthNum, yearNum]
        );

        const totalRecRes = await query(
          `SELECT COUNT(*) AS total_rec FROM attendance_records WHERE employee_id = $1 AND EXTRACT(MONTH FROM attendance_date) = $2 AND EXTRACT(YEAR FROM attendance_date) = $3`,
          [emp.id, monthNum, yearNum]
        );

        const attendedDays = Number(attCountRes.rows[0]?.att_count || 0);
        const paidDays = Math.min(daysInMonth, attendedDays + 4);
        const earnedBase = Math.round(dailyRate * paidDays * 100) / 100;

        // Query overtime requests & attendance overtime
        const attOt = Number(attCountRes.rows[0]?.total_ot || 0);
        let reqOt = 0;
        try {
          const reqOtRes = await query(
            `SELECT COALESCE(SUM(hours_requested), 0) AS req_hours 
             FROM overtime_requests 
             WHERE employee_id = $1 AND status = 'approved' AND EXTRACT(MONTH FROM overtime_date) = $2 AND EXTRACT(YEAR FROM overtime_date) = $3`,
            [emp.id, monthNum, yearNum]
          );
          reqOt = Number(reqOtRes.rows[0]?.req_hours || 0);
        } catch (err) {}

        const hourlyRate = (fullBase / 240) * 1.5;
        const overtimeAmount = Math.round((attOt + reqOt) * hourlyRate * 100) / 100;

        // Query active loans
        let loanDeduction = 0;
        try {
          const activeLoanRes = await query(
            `SELECT id, monthly_deduction, amount, paid_amount FROM employee_loans WHERE employee_id = $1 AND status = 'active'`,
            [emp.id]
          );
          if (activeLoanRes.rows.length > 0) {
            const loan = activeLoanRes.rows[0];
            const remaining = Number(loan.amount) - Number(loan.paid_amount);
            loanDeduction = Math.min(Number(loan.monthly_deduction), Math.max(0, remaining));
          }
        } catch (err) {}

        const deductions = loanDeduction;
        const netSalary = Math.round((earnedBase + totalAllowancesEmp + overtimeAmount - deductions) * 100) / 100;

        totalBaseSalary += earnedBase;
        totalAllowances += totalAllowancesEmp;
        totalOvertime += overtimeAmount;
        totalDeductions += deductions;
        totalNetSalary += netSalary;

        payrollRows.push({
          id: emp.id,
          employee_number: emp.employee_number,
          employee_name: emp.full_name,
          job_title: emp.job_title,
          working_days: daysInMonth,
          actual_days: paidDays,
          base_salary: earnedBase,
          housing_allowance: emp.housing_allowance || 0,
          transport_allowance: emp.transport_allowance || 0,
          other_allowances: totalAllowancesEmp,
          overtime_amount: overtimeAmount,
          deductions,
          net_salary: netSalary
        });
      }
    }

    return NextResponse.json({
      data: payrollRows,
      summary: {
        totalBaseSalary: Math.round(totalBaseSalary * 100) / 100,
        totalAllowances: Math.round(totalAllowances * 100) / 100,
        totalOvertime: Math.round(totalOvertime * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        totalNetSalary: Math.round(totalNetSalary * 100) / 100,
        employeeCount: payrollRows.length
      },
      periodLabel,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[POST /api/hr/payroll/print]', error);
    return NextResponse.json(
      { error: 'فشل إعداد كشف الرواتب للطباعة' },
      { status: 500 }
    );
  }
}
