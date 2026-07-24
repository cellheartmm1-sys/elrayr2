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

export default function ExpensesDetailPage({ params }: Props) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="تفاصيل المصروفات والمشتريات" subtitle="جار التحميل..." icon="🧾">
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

  const { project, expenses = [], allExpenses = [] } = data;
  const totalExpenses = expenses.reduce((acc: number, e: any) => acc + Number(e.total || 0), 0);

  // Filter expenses
  const filteredList = allExpenses.filter((exp: any) => {
    const catMatch = selectedCategory === 'all' || exp.category === selectedCategory;
    const searchMatch = !searchTerm ||
      exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return catMatch && searchMatch;
  });

  return (
    <AppLayout title={`تفاصيل المصروفات والمشتريات - ${project.name}`} subtitle={`كود المشروع: ${project.code}`} icon="🧾">
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

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #b91c1c, #f97316)',
        borderRadius: 'var(--radius-xl)', padding: '2rem', color: '#fff',
        marginBottom: '1.5rem', position: 'relative', overflow: 'hidden',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: '0.4rem' }}>🧾 إجمالي المصروفات النثرية والمشتريات</div>
          <div style={{ fontSize: '2.8rem', fontWeight: 900 }}>{formatCurrency(totalExpenses)}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '4px' }}>
            عدد فئات المصروفات: {expenses.length} | إجمالي الفواتير المسجلة: {allExpenses.length}
          </div>
        </div>
        <div style={{ fontSize: '7rem', opacity: 0.12, position: 'absolute', left: '-10px', bottom: '-20px' }}>🧾</div>
      </div>

      {/* Categories Summary Cards */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">📊 توزيع المصروفات حسب الفئة</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {expenses.map((cat: any, i: number) => {
            const val = Number(cat.total || 0);
            const pct = totalExpenses > 0 ? ((val / totalExpenses) * 100).toFixed(1) : '0';
            return (
              <div
                key={i}
                onClick={() => setSelectedCategory(selectedCategory === cat.category ? 'all' : cat.category)}
                style={{
                  padding: '1rem', borderRadius: '10px', background: selectedCategory === cat.category ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)',
                  border: selectedCategory === cat.category ? '2px solid #ef4444' : '1px solid var(--border-normal)',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {expenseCategoryLabels[cat.category] || cat.category}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
                  {formatCurrency(val)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{pct}% من المصروفات</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="card-title">📜 سجل المصروفات والفواتير تفصيلياً</div>
            <div className="card-subtitle">جميع الفواتير والمشتريات المقيدة على المشروع</div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-normal)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
            >
              <option value="all">جميع الفئات</option>
              {expenses.map((c: any) => (
                <option key={c.category} value={c.category}>{expenseCategoryLabels[c.category] || c.category}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="🔍 بحث بالوصف، المورد أو الفاتورة..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-normal)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.88rem', minWidth: '220px' }}
            />
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            {allExpenses.length === 0 ? 'لا توجد فواتير مصروفات مسجلة تفصيلياً بعد لهذا المشروع' : 'لا توجد نتائج تطابق الفلتر المحدد'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الفئة</th>
                  <th>البيان / الوصف</th>
                  <th>المورد / جهة الصرف</th>
                  <th>رقم الفاتورة</th>
                  <th>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((exp: any, i: number) => (
                  <tr key={exp.id || i}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>
                      {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td>
                      <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                        {expenseCategoryLabels[exp.category] || exp.category}
                      </span>
                    </td>
                    <td><strong>{exp.description || '-'}</strong></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{exp.supplier || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{exp.invoice_number || '-'}</td>
                    <td style={{ fontWeight: 700, color: '#ef4444' }}>{formatCurrency(Number(exp.amount || 0))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                  <td colSpan={5}>الإجمالي في القائمة الحالية</td>
                  <td style={{ color: '#ef4444' }}>
                    {formatCurrency(filteredList.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
