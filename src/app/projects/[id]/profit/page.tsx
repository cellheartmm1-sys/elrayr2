'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

interface PageParams { id: string; }
interface Props { params: Promise<PageParams>; }

const ipcStatusLabels: Record<string, string> = {
  draft: 'مسودة', pending_payment: 'معلق الصرف', paid: 'تم الصرف', client_approved: 'معتمد من الاستشاري',
};
const ipcStatusColors: Record<string, string> = {
  draft: '#6b7280', pending_payment: '#f59e0b', paid: '#10b981', client_approved: '#3b82f6',
};

export default function ProfitDetailPage({ params }: Props) {
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
      <AppLayout title="صافي الربح" subtitle="جار التحميل..." icon="📈">
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
          <Link href={`/projects/${id}`} className="btn btn-primary">العودة للمشروع</Link>
        </div>
      </AppLayout>
    );
  }

  const { project, expenses = [], ipcs = [], subIpcs = [], laborAttendance = [] } = data;
  const contractValue = Number(project.contract_value || 0);

  // Revenue
  const totalInvoiced = ipcs.filter((i: any) => i.status === 'paid' || i.status === 'client_approved' || i.status === 'pending_payment')
    .reduce((acc: number, i: any) => acc + Number(i.net_payable || 0), 0);
  const totalCollected = ipcs.filter((i: any) => i.status === 'paid')
    .reduce((acc: number, i: any) => acc + Number(i.net_payable || 0), 0);

  // Costs
  const totalExpenses = expenses.reduce((acc: number, e: any) => acc + Number(e.total || 0), 0);
  const totalSubcontractorIpc = subIpcs.filter((s: any) => s.status === 'paid' || s.status === 'approved' || s.status === 'submitted')
    .reduce((acc: number, s: any) => acc + Number(s.net_payable || 0), 0);
  const totalDailyLaborCost = laborAttendance.reduce((acc: number, a: any) => {
    const rate = Number(a.base_salary || 150);
    const overtime = Number(a.overtime_hours || 0) * 25;
    return acc + (a.attendance_type === 'present' ? (rate + overtime) : 0);
  }, 0);
  const totalCosts = totalExpenses + totalSubcontractorIpc + totalDailyLaborCost;

  // Profit
  const netProfit = totalInvoiced - totalCosts;
  const profitMargin = totalInvoiced > 0 ? ((netProfit / totalInvoiced) * 100).toFixed(1) : '0';
  const profitOnContract = contractValue > 0 ? ((netProfit / contractValue) * 100).toFixed(1) : '0';
  const isProfit = netProfit >= 0;

  // Potential profit (if full contract value collected)
  const potentialProfit = contractValue - totalCosts;
  const potentialMargin = contractValue > 0 ? ((potentialProfit / contractValue) * 100).toFixed(1) : '0';

  // Detailed cost rows
  const costRows = [
    { label: '🧾 المصروفات والمشتريات', value: totalExpenses, color: '#ef4444' },
    { label: '👷 مستخلصات مقاولي الباطن', value: totalSubcontractorIpc, color: '#f97316' },
    { label: '👥 أجور عمال اليومية', value: totalDailyLaborCost, color: '#8b5cf6' },
  ];

  // Revenue rows from IPC
  const revenueByStatus = [
    { label: '✅ تم صرفه (Paid)', value: totalCollected, color: '#10b981' },
    { label: '🔵 معتمد من الاستشاري', value: ipcs.filter((i: any) => i.status === 'client_approved').reduce((a: number, i: any) => a + Number(i.net_payable || 0), 0), color: '#3b82f6' },
    { label: '⏳ معلق الصرف', value: ipcs.filter((i: any) => i.status === 'pending_payment').reduce((a: number, i: any) => a + Number(i.net_payable || 0), 0), color: '#f59e0b' },
  ];

  return (
    <AppLayout title={`صافي الربح - ${project.name}`} subtitle={`كود المشروع: ${project.code}`} icon="📈">
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/projects/${id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem',
          padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-normal)',
        }}>
          ← العودة إلى المشروع
        </Link>
      </div>

      {/* Net Profit Hero */}
      <div style={{
        background: isProfit
          ? 'linear-gradient(135deg, #047857, #10b981)'
          : 'linear-gradient(135deg, #991b1b, #ef4444)',
        borderRadius: 'var(--radius-xl)', padding: '2rem', color: '#fff',
        marginBottom: '1.5rem', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: '0.9rem', opacity: 0.85, marginBottom: '0.5rem' }}>
            {isProfit ? '✅ صافي الربح الحالي' : '⚠️ صافي الخسارة الحالية'}
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 900 }}>{formatCurrency(Math.abs(netProfit))}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>
            هامش الربح: {profitMargin}% | نسبة من العقد: {profitOnContract}%
          </div>
        </div>
        <div style={{ textAlign: 'left', opacity: 0.12, fontSize: '8rem', position: 'absolute', left: '20px', bottom: '-20px' }}>
          {isProfit ? '📈' : '📉'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ opacity: 0.8 }}>📥 الإيرادات المعتمدة:</span>
            <strong>{formatCurrency(totalInvoiced)}</strong>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ opacity: 0.8 }}>💸 إجمالي التكاليف:</span>
            <strong>{formatCurrency(totalCosts)}</strong>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ opacity: 0.8 }}>📄 قيمة العقد الكلية:</span>
            <strong>{formatCurrency(contractValue)}</strong>
          </div>
        </div>
      </div>

      {/* Potential profit card */}
      <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid var(--border-normal)' }}>
        <div className="card-header">
          <div className="card-title">🎯 الربح المتوقع إذا اكتمل العقد بالكامل</div>
          <div className="card-subtitle">في حال استيفاء كامل قيمة العقد</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>الربح المتوقع الكلي</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: potentialProfit >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(potentialProfit)}</div>
          </div>
          <div style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>هامش الربح المتوقع</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: Number(potentialMargin) >= 0 ? '#10b981' : '#ef4444' }}>{potentialMargin}%</div>
          </div>
          <div style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>المتبقي من العقد</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(contractValue - totalInvoiced)}</div>
          </div>
        </div>
      </div>

      {/* P&L Statement */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">📊 بيان الأرباح والخسائر (P&amp;L)</div>
          <div className="card-subtitle">الإيرادات مقابل التكاليف التفصيلية</div>
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          {/* Revenue section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ✅ الإيرادات المعتمدة
            </div>
            {revenueByStatus.map((row, i) => (
              row.value > 0 && (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{row.label}</span>
                  <strong style={{ color: row.color, fontSize: '1rem' }}>{formatCurrency(row.value)}</strong>
                </div>
              )
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', marginTop: '4px' }}>
              <strong style={{ color: '#10b981' }}>إجمالي الإيرادات المعتمدة</strong>
              <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>{formatCurrency(totalInvoiced)}</strong>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px dashed var(--border-normal)', marginBottom: '1.5rem' }} />

          {/* Costs section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              💸 التكاليف والمصروفات
            </div>
            {costRows.map((row, i) => (
              row.value > 0 && (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{row.label}</span>
                  <strong style={{ color: row.color, fontSize: '1rem' }}>{formatCurrency(row.value)}</strong>
                </div>
              )
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', marginTop: '4px' }}>
              <strong style={{ color: '#ef4444' }}>إجمالي التكاليف</strong>
              <strong style={{ color: '#ef4444', fontSize: '1.1rem' }}>{formatCurrency(totalCosts)}</strong>
            </div>
          </div>

          {/* Net profit line */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '16px 20px',
            background: isProfit ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            borderRadius: '12px', border: `2px solid ${isProfit ? '#10b981' : '#ef4444'}`,
          }}>
            <strong style={{ fontSize: '1.1rem', color: isProfit ? '#10b981' : '#ef4444' }}>
              {isProfit ? '✅ صافي الربح' : '❌ صافي الخسارة'}
            </strong>
            <strong style={{ fontSize: '1.3rem', color: isProfit ? '#10b981' : '#ef4444' }}>
              {formatCurrency(Math.abs(netProfit))}
            </strong>
          </div>
        </div>
      </div>

      {/* Visual profit vs cost bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">📉 مقارنة الإيرادات والتكاليف</div>
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          {[
            { label: 'الإيرادات المعتمدة', value: totalInvoiced, max: Math.max(totalInvoiced, totalCosts, contractValue), color: '#10b981' },
            { label: 'إجمالي التكاليف', value: totalCosts, max: Math.max(totalInvoiced, totalCosts, contractValue), color: '#ef4444' },
            { label: 'قيمة العقد الكلية', value: contractValue, max: Math.max(totalInvoiced, totalCosts, contractValue), color: '#3b82f6' },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                <span style={{ color: item.color, fontWeight: 700 }}>{formatCurrency(item.value)}</span>
              </div>
              <div style={{ height: '14px', background: 'var(--bg-secondary)', borderRadius: '7px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%`,
                  background: item.color, borderRadius: '7px', transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IPC table for reference */}
      {ipcs.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">🧾 مستخلصات الإيرادات</div>
            <div className="card-subtitle">المستخلصات المعتمدة المستخدمة في حساب الربح</div>
          </div>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>رقم المستخلص</th>
                  <th>التاريخ</th>
                  <th>الحالة</th>
                  <th>المبلغ</th>
                  <th>في حساب الربح؟</th>
                </tr>
              </thead>
              <tbody>
                {ipcs.map((ipc: any) => {
                  const counted = ipc.status === 'paid' || ipc.status === 'client_approved' || ipc.status === 'pending_payment';
                  return (
                    <tr key={ipc.id} style={{ opacity: counted ? 1 : 0.5 }}>
                      <td><strong>{ipc.ipc_number}</strong></td>
                      <td>{ipc.ipc_date ? new Date(ipc.ipc_date).toLocaleDateString('ar-EG') : '-'}</td>
                      <td>
                        <span style={{
                          background: ipcStatusColors[ipc.status] || '#6b7280',
                          color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600,
                        }}>
                          {ipcStatusLabels[ipc.status] || ipc.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(Number(ipc.net_payable || 0))}</td>
                      <td>
                        {counted
                          ? <span style={{ color: '#10b981', fontWeight: 700 }}>✅ نعم</span>
                          : <span style={{ color: '#6b7280' }}>❌ لا (مسودة)</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                  <td colSpan={3}>إجمالي المعتمد في الحساب</td>
                  <td style={{ color: '#10b981' }}>{formatCurrency(totalInvoiced)}</td>
                  <td>-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
