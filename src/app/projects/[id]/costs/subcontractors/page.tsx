'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

interface PageParams { id: string; }
interface Props { params: Promise<PageParams>; }

const ipcStatusLabels: Record<string, string> = {
  submitted: 'مرفوع',
  approved: 'معتمد',
  paid: 'تم الصرف',
  rejected: 'مرفوض',
};
const ipcStatusColors: Record<string, string> = {
  submitted: '#f59e0b',
  approved: '#3b82f6',
  paid: '#10b981',
  rejected: '#ef4444',
};

export default function SubcontractorsDetailPage({ params }: Props) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState('all');

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="تفاصيل مستخلصات مقاولي الباطن" subtitle="جار التحميل..." icon="👷">
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

  const { project, subIpcs = [] } = data;

  const validIpcs = subIpcs.filter((s: any) => s.status === 'paid' || s.status === 'approved' || s.status === 'submitted');
  const totalSubcontractorIpc = validIpcs.reduce((acc: number, s: any) => acc + Number(s.net_payable || 0), 0);
  const totalPaid = subIpcs.filter((s: any) => s.status === 'paid').reduce((acc: number, s: any) => acc + Number(s.net_payable || 0), 0);
  const totalApprovedOrSubmitted = subIpcs.filter((s: any) => s.status === 'approved' || s.status === 'submitted').reduce((acc: number, s: any) => acc + Number(s.net_payable || 0), 0);

  // Group by subcontractor
  const subsSummary = subIpcs.reduce((acc: Record<string, any>, s: any) => {
    const name = s.subcontractor_name || 'غير محدد';
    if (!acc[name]) {
      acc[name] = { name, scope: s.scope_of_work, total: 0, paid: 0, pending: 0, count: 0 };
    }
    const val = Number(s.net_payable || 0);
    acc[name].count += 1;
    if (s.status === 'paid' || s.status === 'approved' || s.status === 'submitted') {
      acc[name].total += val;
    }
    if (s.status === 'paid') acc[name].paid += val;
    if (s.status === 'approved' || s.status === 'submitted') acc[name].pending += val;
    return acc;
  }, {});

  const filteredIpcs = subIpcs.filter((s: any) => selectedSubcontractor === 'all' || s.subcontractor_name === selectedSubcontractor);

  return (
    <AppLayout title={`تفاصيل مستخلصات مقاولي الباطن - ${project.name}`} subtitle={`كود المشروع: ${project.code}`} icon="👷">
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

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #c2410c, #f97316)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>👷 إجمالي مستخلصات مقاولي الباطن</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(totalSubcontractorIpc)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>عدد المستخلصات: {subIpcs.length}</div>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>👷</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #047857, #10b981)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>✅ المسدد لمقاولي الباطن</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(totalPaid)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>حالة (تم الصرف)</div>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>💳</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #b45309, #f59e0b)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>⏳ المستحق والصرف المعلق</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(totalApprovedOrSubmitted)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>مرفوع أو معتمد للجهة</div>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>⏳</div>
        </div>
      </div>

      {/* Summary by Subcontractor */}
      {Object.values(subsSummary).length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">👷 ملخص مقاولي الباطن في المشروع</div>
          </div>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>اسم المقاول</th>
                  <th>نطاق العمل</th>
                  <th>عدد المستخلصات</th>
                  <th>إجمالي المستحق</th>
                  <th>تم صرفه</th>
                  <th>متبقي صرفه</th>
                </tr>
              </thead>
              <tbody>
                {(Object.values(subsSummary) as any[]).map((sub, i) => (
                  <tr key={i} onClick={() => setSelectedSubcontractor(selectedSubcontractor === sub.name ? 'all' : sub.name)} style={{ cursor: 'pointer' }}>
                    <td><strong>{sub.name}</strong></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{sub.scope || '-'}</td>
                    <td>{sub.count}</td>
                    <td style={{ fontWeight: 700, color: '#f97316' }}>{formatCurrency(sub.total)}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(sub.paid)}</td>
                    <td style={{ color: '#f59e0b', fontWeight: 600 }}>{formatCurrency(sub.pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subcontractor IPC Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="card-title">🧾 مستخلصات مقاولي الباطن (IPC)</div>
            <div className="card-subtitle">قائمة المستخلصات المرفوعة من مقاولي الباطن</div>
          </div>
          <select
            value={selectedSubcontractor}
            onChange={e => setSelectedSubcontractor(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-normal)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
          >
            <option value="all">جميع المقاولين</option>
            {Object.keys(subsSummary).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {filteredIpcs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>لا توجد مستخلصات لمقاولي الباطن مسجلة لهذا الفلتر</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>رقم المستخلص</th>
                  <th>اسم المقاول</th>
                  <th>نطاق العمل</th>
                  <th>تاريخ المستخلص</th>
                  <th>المبلغ الصافي المستحق</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredIpcs.map((ipc: any) => (
                  <tr key={ipc.id}>
                    <td><strong>{ipc.ipc_number || '-'}</strong></td>
                    <td>{ipc.subcontractor_name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{ipc.scope_of_work || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>
                      {ipc.ipc_date ? new Date(ipc.ipc_date).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#f97316' }}>{formatCurrency(Number(ipc.net_payable || 0))}</td>
                    <td>
                      <span style={{
                        background: ipcStatusColors[ipc.status] || '#6b7280',
                        color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600,
                      }}>
                        {ipcStatusLabels[ipc.status] || ipc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                  <td colSpan={4}>الإجمالي</td>
                  <td style={{ color: '#f97316' }}>
                    {formatCurrency(filteredIpcs.reduce((acc: number, s: any) => acc + Number(s.net_payable || 0), 0))}
                  </td>
                  <td>-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
