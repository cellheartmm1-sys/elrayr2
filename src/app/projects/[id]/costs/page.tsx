'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

interface PageParams { id: string; }
interface Props { params: Promise<PageParams>; }

const expenseCategoryLabels: Record<string, string> = {
  materials: '🧱 مواد ومشتريات',
  tools: '🔧 أدوات ومعدات',
  transport: '🚛 نقل ومواصلات',
  fuel: '⛽ وقود',
  accommodation: '🏠 سكن وإقامة',
  food: '🍽️ طعام وتموين',
  subcontractor: '👷 مقاولين باطن',
  other: '📦 مصروفات أخرى',
};

export default function CostsDetailPage({ params }: Props) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="تفاصيل التكاليف" subtitle="جار التحميل..." icon="💸">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!data?.project) {
    return (
      <AppLayout title="خطأ" subtitle="المشروع غير موجود" icon="❌">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Link href={`/projects/${id}`} className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>العودة للمشروع</Link>
        </div>
      </AppLayout>
    );
  }

  const { project, expenses: rawExpenses = [], subIpcs = [], laborAttendance = [] } = data;
  const expenses = rawExpenses.filter((e: any) => e.category !== 'labor' && e.category !== 'salaries');
  const contractValue = Number(project.contract_value || 0);

  // Expenses
  const totalExpenses = expenses.reduce((acc: number, e: any) => acc + Number(e.total || 0), 0);

  // Subcontractor IPCs
  const paidSubIpcs = subIpcs.filter((s: any) => s.status === 'paid' || s.status === 'approved' || s.status === 'submitted');
  const totalSubcontractorIpc = paidSubIpcs.reduce((acc: number, s: any) => acc + Number(s.net_payable || 0), 0);

  const getDailyRate = (a: any) => {
    const base = Number(a.base_salary || 0);
    if (!base) return 150;
    if (a.employment_type === 'daily') return base;
    let daysInMonth = 30;
    if (a.attendance_date) {
      const d = new Date(a.attendance_date);
      if (!isNaN(d.getTime())) {
        daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      }
    }
    return base / daysInMonth;
  };

  // Labor
  const totalDailyLaborCost = laborAttendance.reduce((acc: number, a: any) => {
    const rate = getDailyRate(a);
    const overtime = Number(a.overtime_hours || 0) * 25;
    return acc + (a.attendance_type === 'present' ? (rate + overtime) : 0);
  }, 0);

  const totalCosts = totalExpenses + totalSubcontractorIpc + totalDailyLaborCost;
  const costRatio = contractValue > 0 ? ((totalCosts / contractValue) * 100).toFixed(1) : '0';

  // Cost breakdown
  const costBreakdown = [
    { label: '🧾 المصروفات والمشتريات', value: totalExpenses, color: '#ef4444', pct: totalCosts > 0 ? (totalExpenses / totalCosts) * 100 : 0 },
    { label: '👷 مستخلصات مقاولي الباطن', value: totalSubcontractorIpc, color: '#f97316', pct: totalCosts > 0 ? (totalSubcontractorIpc / totalCosts) * 100 : 0 },
    { label: '👥 أجور عمال اليومية', value: totalDailyLaborCost, color: '#8b5cf6', pct: totalCosts > 0 ? (totalDailyLaborCost / totalCosts) * 100 : 0 },
  ];

  // Labor breakdown by employee
  const laborByEmployee = laborAttendance
    .filter((a: any) => a.attendance_type === 'present')
    .reduce((acc: Record<string, any>, a: any) => {
      const key = a.employee_id;
      if (!acc[key]) {
        acc[key] = { name: a.employee_name, job_title: a.job_title || '-', days: 0, overtime: 0, cost: 0 };
      }
      const rate = getDailyRate(a);
      const overtime = Number(a.overtime_hours || 0) * 25;
      acc[key].days += 1;
      acc[key].overtime += Number(a.overtime_hours || 0);
      acc[key].cost += rate + overtime;
      return acc;
    }, {});

  const subcontractorsByName = subIpcs.reduce((acc: Record<string, any>, s: any) => {
    const key = s.subcontractor_name;
    if (!acc[key]) acc[key] = { name: key, scope: s.scope_of_work, total: 0, count: 0 };
    acc[key].total += Number(s.net_payable || 0);
    acc[key].count += 1;
    return acc;
  }, {});

  return (
    <AppLayout title={`تفاصيل التكاليف - ${project.name}`} subtitle={`كود المشروع: ${project.code}`} icon="💸">
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/projects/${id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem',
          padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-normal)',
          transition: 'all 0.2s',
        }}>
          ← العودة إلى المشروع
        </Link>
      </div>

      {/* Hero KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #b91c1c, #ef4444)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>💸 إجمالي التكاليف</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(totalCosts)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>{costRatio}% من قيمة العقد</div>
          <a href={`/projects/${id}/costs/summary`} className="kpi-detail-btn">تفاصيل ←</a>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>📊</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #b91c1c, #f97316)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>🧾 مصروفات ومشتريات</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(totalExpenses)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>{totalCosts > 0 ? ((totalExpenses / totalCosts) * 100).toFixed(1) : 0}% من التكاليف</div>
          <a href={`/projects/${id}/costs/expenses`} className="kpi-detail-btn">تفاصيل ←</a>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>🧾</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #c2410c, #f97316)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>👷 مقاولو الباطن</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(totalSubcontractorIpc)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>{totalCosts > 0 ? ((totalSubcontractorIpc / totalCosts) * 100).toFixed(1) : 0}% من التكاليف</div>
          <a href={`/projects/${id}/costs/subcontractors`} className="kpi-detail-btn">تفاصيل ←</a>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>👷</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #5b21b6, #8b5cf6)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>👥 عمال اليومية</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(totalDailyLaborCost)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>{totalCosts > 0 ? ((totalDailyLaborCost / totalCosts) * 100).toFixed(1) : 0}% من التكاليف</div>
          <a href={`/projects/${id}/labor`} className="kpi-detail-btn">تفاصيل ←</a>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>👥</div>
        </div>
      </div>

      {/* Cost Breakdown Visual */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">📊 توزيع التكاليف</div>
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          {costBreakdown.map((item, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.label}</span>
                <span style={{ color: item.color, fontWeight: 700 }}>{formatCurrency(item.value)} ({item.pct.toFixed(1)}%)</span>
              </div>
              <div style={{ height: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${item.pct}%`, background: item.color,
                  borderRadius: '6px', transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses by Category */}
      {expenses.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">🧾 المصروفات حسب الفئة</div>
          </div>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>الفئة</th>
                  <th>الإجمالي</th>
                  <th>نسبة من المصروفات</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp: any, i: number) => {
                  const pct = totalExpenses > 0 ? ((Number(exp.total) / totalExpenses) * 100).toFixed(1) : '0';
                  return (
                    <tr key={i}>
                      <td>{expenseCategoryLabels[exp.category] || exp.category}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(Number(exp.total || 0))}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: '#ef4444', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', minWidth: '40px' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                  <td>الإجمالي</td>
                  <td>{formatCurrency(totalExpenses)}</td>
                  <td>100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Subcontractors */}
      {Object.values(subcontractorsByName).length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">👷 مقاولو الباطن</div>
          </div>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>المقاول</th>
                  <th>نطاق العمل</th>
                  <th>عدد المستخلصات</th>
                  <th>الإجمالي المنصرف</th>
                </tr>
              </thead>
              <tbody>
                {(Object.values(subcontractorsByName) as any[]).map((sc: any, i: number) => (
                  <tr key={i}>
                    <td><strong>{sc.name}</strong></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{sc.scope || '-'}</td>
                    <td>{sc.count}</td>
                    <td style={{ fontWeight: 700, color: '#f97316' }}>{formatCurrency(sc.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                  <td colSpan={3}>الإجمالي</td>
                  <td style={{ color: '#f97316' }}>{formatCurrency(totalSubcontractorIpc)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Labor employee table */}
      {Object.values(laborByEmployee).length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">👥 تكلفة العمال</div>
            <div className="card-subtitle">تفصيل تكلفة كل عامل بناءً على الحضور</div>
          </div>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>اسم العامل</th>
                  <th>المسمى الوظيفي</th>
                  <th>أيام الحضور</th>
                  <th>ساعات إضافية</th>
                  <th>إجمالي التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {(Object.values(laborByEmployee) as any[]).map((emp: any, i: number) => (
                  <tr key={i}>
                    <td><strong>{emp.name}</strong></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{emp.job_title}</td>
                    <td>{emp.days} يوم</td>
                    <td>{emp.overtime > 0 ? `${emp.overtime.toFixed(1)} ساعة` : '-'}</td>
                    <td style={{ fontWeight: 700, color: '#8b5cf6' }}>{formatCurrency(emp.cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                  <td colSpan={4}>الإجمالي</td>
                  <td style={{ color: '#8b5cf6' }}>{formatCurrency(totalDailyLaborCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
