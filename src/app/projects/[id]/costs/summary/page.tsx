'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

interface PageParams { id: string; }
interface Props { params: Promise<PageParams>; }

export default function TotalCostsSummaryPage({ params }: Props) {
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
      <AppLayout title="ملخص التكاليف الإجمالية" subtitle="جار التحميل..." icon="📊">
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
          <Link href={`/projects/${id}/costs`} className="btn btn-primary">العودة للتكاليف</Link>
        </div>
      </AppLayout>
    );
  }

  const { project, expenses: rawExpenses = [], subIpcs = [], laborAttendance = [], ipcs = [] } = data;
  const expenses = rawExpenses.filter((e: any) => e.category !== 'labor' && e.category !== 'salaries');
  const contractValue = Number(project.contract_value || 0);

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

  const totalExpenses = expenses.reduce((acc: number, e: any) => acc + Number(e.total || 0), 0);
  const totalSubcontractorIpc = subIpcs
    .filter((s: any) => s.status === 'paid' || s.status === 'approved' || s.status === 'submitted')
    .reduce((acc: number, s: any) => acc + Number(s.net_payable || 0), 0);
  const totalDailyLaborCost = laborAttendance.reduce((acc: number, a: any) => {
    const rate = getDailyRate(a);
    const overtime = Number(a.overtime_hours || 0) * 25;
    return acc + (a.attendance_type === 'present' ? (rate + overtime) : 0);
  }, 0);

  const totalCosts = totalExpenses + totalSubcontractorIpc;
  const costRatio = contractValue > 0 ? ((totalCosts / contractValue) * 100).toFixed(1) : '0';
  const totalInvoiced = ipcs.filter((i: any) => i.status === 'paid' || i.status === 'client_approved' || i.status === 'pending_payment')
    .reduce((acc: number, i: any) => acc + Number(i.net_payable || 0), 0);

  return (
    <AppLayout title={`ملخص التكاليف الإجمالية - ${project.name}`} subtitle={`كود المشروع: ${project.code}`} icon="📊">
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/projects/${id}/costs`} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem',
          padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-normal)',
        }}>
          ← العودة لصفحة التكاليف
        </Link>
      </div>

      {/* Hero card */}
      <div style={{
        background: 'linear-gradient(135deg, #b91c1c, #ef4444)',
        borderRadius: 'var(--radius-xl)', padding: '2rem', color: '#fff',
        marginBottom: '1.5rem', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ fontSize: '0.9rem', opacity: 0.85, marginBottom: '0.5rem' }}>💸 إجمالي نفقات وتكاليف المشروع حتى الآن</div>
        <div style={{ fontSize: '3rem', fontWeight: 900 }}>{formatCurrency(totalCosts)}</div>
        <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '6px' }}>
          نسبة التكاليف إلى قيمة العقد: {costRatio}% | من أصل عقد بقيمة {formatCurrency(contractValue)}
        </div>
        <div style={{ position: 'absolute', left: '-10px', bottom: '-20px', fontSize: '8rem', opacity: 0.1 }}>📊</div>
      </div>

      {/* Detailed cost categories comparison */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">🔍 تفصيل وتوزيع نفقات المشروع</div>
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          {[
            { title: '🧾 المصروفات النثرية والمشتريات', amount: totalExpenses, color: '#ef4444', desc: 'ماديات، أدوات، سكن، محروقات ومشتريات الموقع', link: `/projects/${id}/costs/expenses` },
            { title: '👷 مستخلصات مقاولي الباطن', amount: totalSubcontractorIpc, color: '#f97316', desc: 'المستخلصات المرفوعة والمعتمدة لمقاولي الباطن', link: `/projects/${id}/costs/subcontractors` },
            { title: '👥 أجور عمال اليومية والمشرفين', amount: totalDailyLaborCost, color: '#8b5cf6', desc: 'تكاليف حضور العمال والمشرفين اليومية', link: `/projects/${id}/labor` },
          ].map((cat, i) => {
            const pct = totalCosts > 0 ? ((cat.amount / totalCosts) * 100).toFixed(1) : '0';
            return (
              <div key={i} style={{
                padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)',
                marginBottom: '1rem', border: '1px solid var(--border-normal)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
              }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{cat.title}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{cat.desc}</div>
                  <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', marginTop: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: '4px' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: cat.color }}>{formatCurrency(cat.amount)}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>{pct}% من إجمالي التكاليف</div>
                  <Link href={cat.link} style={{
                    display: 'inline-block', marginTop: '6px', fontSize: '0.78rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600
                  }}>
                    عرض التفاصيل ←
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison: Invoiced vs Cost vs Contract */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📈 التكاليف مقابل الإيرادات والعقد</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي قيمة العقد</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>{formatCurrency(contractValue)}</div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>المستخلصات المعتمدة</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{formatCurrency(totalInvoiced)}</div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي المصروف والتكاليف</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{formatCurrency(totalCosts)}</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
