'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

interface PageParams { id: string; }
interface Props { params: Promise<PageParams>; }

const ipcStatusLabels: Record<string, string> = {
  draft: 'مسودة',
  pending_payment: 'معلق الصرف',
  paid: 'تم الصرف',
  client_approved: 'معتمد من الاستشاري',
};
const ipcStatusColors: Record<string, string> = {
  draft: '#6b7280',
  pending_payment: '#f59e0b',
  paid: '#10b981',
  client_approved: '#3b82f6',
};

export default function ContractDetailPage({ params }: Props) {
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
      <AppLayout title="تفاصيل قيمة العقد" subtitle="جار التحميل..." icon="📄">
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
          <p style={{ color: 'var(--text-secondary)' }}>لم يتم العثور على بيانات المشروع</p>
          <Link href={`/projects/${id}`} className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>العودة للمشروع</Link>
        </div>
      </AppLayout>
    );
  }

  const { project, ipcs = [], phases = [] } = data;
  const contractValue = Number(project.contract_value || 0);

  const paidIpcs = ipcs.filter((i: any) => i.status === 'paid');
  const approvedIpcs = ipcs.filter((i: any) => i.status === 'client_approved');
  const pendingIpcs = ipcs.filter((i: any) => i.status === 'pending_payment');
  const draftIpcs = ipcs.filter((i: any) => i.status === 'draft');

  const totalPaid = paidIpcs.reduce((acc: number, i: any) => acc + Number(i.net_payable || 0), 0);
  const totalApproved = approvedIpcs.reduce((acc: number, i: any) => acc + Number(i.net_payable || 0), 0);
  const totalPending = pendingIpcs.reduce((acc: number, i: any) => acc + Number(i.net_payable || 0), 0);
  const totalInvoiced = totalPaid + totalApproved + totalPending;
  const remaining = contractValue - totalInvoiced;
  const collectionRate = contractValue > 0 ? ((totalPaid / contractValue) * 100).toFixed(1) : '0';

  return (
    <AppLayout title={`تفاصيل قيمة العقد - ${project.name}`} subtitle={`كود المشروع: ${project.code}`} icon="📄">
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Contract value */}
        <div style={{
          background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>📄 إجمالي قيمة العقد</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(contractValue)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>
            {project.payment_type === 'once' ? 'دفعة واحدة' : 'على دفعات'}
          </div>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>💰</div>
        </div>

        {/* Collected */}
        <div style={{
          background: 'linear-gradient(135deg, #047857, #10b981)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>✅ تم صرفه / تحصيله</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(totalPaid)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>نسبة التحصيل: {collectionRate}%</div>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>📈</div>
        </div>

        {/* Invoiced (pending) */}
        <div style={{
          background: 'linear-gradient(135deg, #b45309, #f59e0b)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>⏳ مرفوع ولم يُصرف بعد</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(totalApproved + totalPending)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>من إجمالي المستخلصات</div>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>📋</div>
        </div>

        {/* Remaining */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>🔵 المتبقي من العقد</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(remaining)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>لم يُرفع بعد</div>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>⏱️</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">📊 نسبة استيفاء العقد</div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>تم التحصيل: {collectionRate}%</span>
            <span>إجمالي العقد: {formatCurrency(contractValue)}</span>
          </div>
          <div style={{ height: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
            {/* Paid */}
            <div style={{
              position: 'absolute', right: 0, top: 0, height: '100%',
              width: `${contractValue > 0 ? (totalPaid / contractValue) * 100 : 0}%`,
              background: 'linear-gradient(90deg, #047857, #10b981)',
              borderRadius: '8px', transition: 'width 0.5s ease',
            }} />
            {/* Pending on top */}
            <div style={{
              position: 'absolute', right: `${contractValue > 0 ? (totalPaid / contractValue) * 100 : 0}%`, top: 0, height: '100%',
              width: `${contractValue > 0 ? ((totalApproved + totalPending) / contractValue) * 100 : 0}%`,
              background: 'linear-gradient(90deg, #b45309, #f59e0b)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '8px', fontSize: '0.78rem' }}>
            <span style={{ color: '#10b981' }}>■ تم الصرف</span>
            <span style={{ color: '#f59e0b' }}>■ معلق / معتمد</span>
            <span style={{ color: 'var(--text-muted)' }}>■ متبقي</span>
          </div>
        </div>
      </div>

      {/* IPC History Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">🧾 سجل المستخلصات (IPC)</div>
          <div className="card-subtitle">جميع المستخلصات المرفوعة للعميل أو الاستشاري</div>
        </div>
        {ipcs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا توجد مستخلصات مسجلة حتى الآن</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>رقم المستخلص</th>
                  <th>التاريخ</th>
                  <th>المبلغ الصافي</th>
                  <th>الحالة</th>
                  <th>نسبة من العقد</th>
                </tr>
              </thead>
              <tbody>
                {ipcs.map((ipc: any) => {
                  const pct = contractValue > 0 ? ((Number(ipc.net_payable || 0) / contractValue) * 100).toFixed(1) : '0';
                  return (
                    <tr key={ipc.id}>
                      <td><strong>{ipc.ipc_number}</strong></td>
                      <td>{ipc.ipc_date ? new Date(ipc.ipc_date).toLocaleDateString('ar-EG') : '-'}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(Number(ipc.net_payable || 0))}</td>
                      <td>
                        <span style={{
                          background: ipcStatusColors[ipc.status] || '#6b7280',
                          color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600,
                        }}>
                          {ipcStatusLabels[ipc.status] || ipc.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: ipcStatusColors[ipc.status] || '#6b7280', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '40px' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                  <td colSpan={2}>الإجمالي</td>
                  <td>{formatCurrency(totalInvoiced)}</td>
                  <td>-</td>
                  <td>{contractValue > 0 ? ((totalInvoiced / contractValue) * 100).toFixed(1) : 0}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Phases with contract value allocation */}
      {phases.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">📐 توزيع قيمة العقد على المراحل</div>
            <div className="card-subtitle">قيمة كل مرحلة بناءً على وزنها النسبي</div>
          </div>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>المرحلة</th>
                  <th>الوزن %</th>
                  <th>القيمة المقابلة</th>
                  <th>الإنجاز الفعلي</th>
                  <th>القيمة المنجزة</th>
                </tr>
              </thead>
              <tbody>
                {phases.map((phase: any) => {
                  const weight = Number(phase.weight_percentage || 0);
                  const phaseValue = contractValue * (weight / 100);
                  const actual = Number(phase.actual_progress || 0);
                  const earnedValue = phaseValue * (actual / 100);
                  return (
                    <tr key={phase.id}>
                      <td><strong>{phase.phase_name}</strong></td>
                      <td>{weight}%</td>
                      <td>{formatCurrency(phaseValue)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${actual}%`, background: '#3b82f6', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', minWidth: '36px' }}>{actual}%</span>
                        </div>
                      </td>
                      <td style={{ color: '#10b981', fontWeight: 700 }}>{formatCurrency(earnedValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                  <td>الإجمالي</td>
                  <td>{phases.reduce((a: number, p: any) => a + Number(p.weight_percentage || 0), 0)}%</td>
                  <td>{formatCurrency(contractValue)}</td>
                  <td>-</td>
                  <td style={{ color: '#10b981' }}>
                    {formatCurrency(phases.reduce((a: number, p: any) => {
                      const w = Number(p.weight_percentage || 0);
                      const act = Number(p.actual_progress || 0);
                      return a + contractValue * (w / 100) * (act / 100);
                    }, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
