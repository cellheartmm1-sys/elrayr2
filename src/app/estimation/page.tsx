'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';

interface Estimation {
  id: string; project_name: string; tender_name: string; tender_number: string;
  client_name: string; submission_date: string; status: string;
  total_material_cost: string; total_labor_cost: string; total_price: string;
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة', submitted: 'تم التقديم', won: 'تم الفوز بها 🎉', lost: 'لم نفز بها', cancelled: 'ملغاة'
};
const statusBadge: Record<string, string> = {
  draft: 'badge-muted', submitted: 'badge-warning', won: 'badge-success', lost: 'badge-danger', cancelled: 'badge-muted'
};

function formatCurrency(val: string | number) {
  return Number(val).toLocaleString('ar-EG') + ' ج.م';
}

export default function EstimationPage() {
  const [estimations, setEstimations] = useState<Estimation[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Form
  const [form, setForm] = useState({
    project_id: '', tender_name: '', tender_number: '', client_name: '',
    submission_date: '', status: 'draft', overhead_percentage: '15', profit_percentage: '10'
  });

  const fetchEstimations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    try {
      const res = await fetch(`/api/estimation?${params}`);
      const data = await res.json();
      setEstimations(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [statusFilter]);

  const fetchProjectsList = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  };

  useEffect(() => {
    fetchEstimations();
    fetchProjectsList();
  }, [fetchEstimations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/estimation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        setForm({
          project_id: '', tender_name: '', tender_number: '', client_name: '',
          submission_date: '', status: 'draft', overhead_percentage: '15', profit_percentage: '10'
        });
        fetchEstimations();
      }
    } catch (err) { console.error(err); }
  };

  return (
    <AppLayout title="الهندسة والتسعير" subtitle="إدخال مقايسات حصر الكميات (BOQ) وتحديد تكلفة المواد والمصنعيات لتقديم عروض الأسعار" icon="📐">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">📐 عروض أسعار المناقصات والمقايسات</div>
          <div className="page-description">حساب تكلفة المواد والمصنعيات مع نسبة الأرباح والمصاريف النثرية</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ إنشاء عرض سعر جديد</button>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-control" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">كل الحالات</option>
          {Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><div className="loading-spinner" /></div>
        ) : estimations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📐</div>
            <div className="empty-state-title">لا توجد عروض أسعار أو تسعيرات مسجلة بعد</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم المناقصة</th>
                  <th>اسم عرض السعر / المناقصة</th>
                  <th>العميل</th>
                  <th>تاريخ التقديم</th>
                  <th>تكلفة المواد</th>
                  <th>تكلفة المصنعية والعمالة</th>
                  <th>السعر النهائي المقترح</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {estimations.map(est => (
                  <tr key={est.id}>
                    <td style={{ fontWeight: 700 }}>{est.tender_number || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{est.tender_name}</td>
                    <td>{est.client_name || '-'}</td>
                    <td>{est.submission_date ? new Date(est.submission_date).toLocaleDateString('ar-SA') : '-'}</td>
                    <td>{formatCurrency(est.total_material_cost || 0)}</td>
                    <td>{formatCurrency(est.total_labor_cost || 0)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--status-success)' }}>{formatCurrency(est.total_price || 0)}</td>
                    <td><span className={`badge ${statusBadge[est.status] || 'badge-muted'}`}>{statusLabels[est.status] || est.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================== MODAL: ADD ESTIMATION ======================== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📐 إنشاء عرض سعر جديد لمناقصة</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-grid form-grid-2">
                <div className="form-group col-span-2">
                  <label className="form-label">المشروع المرتبط (إن وجد)</label>
                  <select className="form-control" value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}>
                    <option value="">اختر المشروع...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">اسم عرض السعر / المناقصة</label>
                  <input className="form-control" required value={form.tender_name} onChange={e => setForm({...form, tender_name: e.target.value})} placeholder="عرض سعر مجمع العليا..." />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم المناقصة / كود المرجع</label>
                  <input className="form-control" value={form.tender_number} onChange={e => setForm({...form, tender_number: e.target.value})} placeholder="TND-2026-xxx" />
                </div>
                <div className="form-group">
                  <label className="form-label required">اسم العميل المستهدف</label>
                  <input className="form-control" required value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} placeholder="مؤسسة التطوير العقاري..." />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ تسليم العرض</label>
                  <input className="form-control" type="date" value={form.submission_date} onChange={e => setForm({...form, submission_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">نسبة المصاريف الإضافية (Overhead) %</label>
                  <input className="form-control" type="number" value={form.overhead_percentage} onChange={e => setForm({...form, overhead_percentage: e.target.value})} placeholder="15" />
                </div>
                <div className="form-group">
                  <label className="form-label">نسبة الربح المستهدفة (Profit) %</label>
                  <input className="form-control" type="number" value={form.profit_percentage} onChange={e => setForm({...form, profit_percentage: e.target.value})} placeholder="10" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 بدء التسعير</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
