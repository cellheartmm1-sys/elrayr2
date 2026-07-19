import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (!type) {
    return NextResponse.json({ error: 'نوع التفاصيل مطلوب' }, { status: 400 });
  }

  try {
    let result;
    
    switch (type) {
      case 'projects': // مشاريع نشطة
        result = await query(`
          SELECT name, code, client_name, start_date, end_date, contract_value 
          FROM projects 
          WHERE status = 'active' 
          ORDER BY created_at DESC
        `);
        break;

      case 'contracts': // إجمالي قيمة العقود
        result = await query(`
          SELECT name, code, client_name, contract_value, status 
          FROM projects 
          ORDER BY contract_value DESC
        `);
        break;

      case 'employees': // موظف نشط
        result = await query(`
          SELECT employee_number, full_name, job_title, nationality, phone 
          FROM employees 
          WHERE status = 'active' 
          ORDER BY created_at DESC
        `);
        break;

      case 'tickets': // بلاغات أعطال مفتوحة
        result = await query(`
          SELECT ticket_number, client_name, fault_description, urgency, status 
          FROM fault_tickets 
          WHERE status = 'open' 
          ORDER BY created_at DESC
        `);
        break;

      case 'documents': // وثائق تنتهي خلال 30 يوم
        result = await query(`
          SELECT e.full_name, e.employee_number, d.document_type, d.document_number, d.expiry_date,
                 (d.expiry_date - CURRENT_DATE) as days_remaining 
          FROM employee_documents d 
          JOIN employees e ON e.id = d.employee_id 
          WHERE d.expiry_date <= NOW() + INTERVAL '30 days' AND d.expiry_date > NOW() 
          ORDER BY d.expiry_date ASC
        `);
        break;

      case 'overtime': // طلبات عمل إضافي معلقة
        result = await query(`
          SELECT e.full_name as employee_name, p.name as project_name, o.overtime_date, o.hours as hours_requested, o.reason 
          FROM overtime o 
          JOIN employees e ON e.id = o.employee_id 
          LEFT JOIN projects p ON p.id = o.project_id 
          WHERE o.status = 'pending' 
          ORDER BY o.created_at DESC
        `);
        break;

      case 'maintenance': // عقود صيانة نشطة
        result = await query(`
          SELECT contract_number, client_name, annual_value as contract_value, start_date, end_date 
          FROM maintenance_contracts 
          WHERE status = 'active' 
          ORDER BY created_at DESC
        `);
        break;

      case 'expenses': // مصروفات هذا الشهر
        result = await query(`
          SELECT pe.expense_date, COALESCE(pe.description, pe.category) as item_name, pe.amount, p.name as project_name 
          FROM project_expenses pe 
          LEFT JOIN projects p ON p.id = pe.project_id 
          WHERE EXTRACT(MONTH FROM pe.expense_date) = EXTRACT(MONTH FROM NOW()) 
            AND EXTRACT(YEAR FROM pe.expense_date) = EXTRACT(YEAR FROM NOW()) 
          ORDER BY pe.expense_date DESC
        `);
        break;

      default:
        return NextResponse.json({ error: 'نوع التفاصيل غير مدعوم' }, { status: 400 });
    }

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching dashboard details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
