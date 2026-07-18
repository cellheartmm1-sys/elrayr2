'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

interface Estimation {
  id: string;
  project_id?: string;
  project_name?: string;
  tender_name: string;
  tender_number: string;
  client_name: string;
  submission_date: string;
  status: string;
  overhead_percentage?: number | string;
  profit_percentage?: number | string;
  total_material_cost: string;
  total_labor_cost: string;
  total_price: string;
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة', submitted: 'تم التقديم', won: 'تم الفوز بها 🎉', lost: 'لم نفز بها', cancelled: 'ملغاة'
};
const statusBadge: Record<string, string> = {
  draft: 'badge-muted', submitted: 'badge-warning', won: 'badge-success', lost: 'badge-danger', cancelled: 'badge-muted'
};

export default function EstimationPage() {
  const [estimations, setEstimations] = useState<Estimation[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Edit & Print States
  const [editingEstimation, setEditingEstimation] = useState<Estimation | null>(null);
  const [printingEstimation, setPrintingEstimation] = useState<Estimation | null>(null);

  // Form State
  const [form, setForm] = useState({
    project_id: '', tender_name: '', tender_number: '', client_name: '',
    submission_date: '', status: 'draft', overhead_percentage: '15', profit_percentage: '10',
    total_material_cost: '0', total_labor_cost: '0'
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

  const fetchCompanyInfo = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setCompanyInfo(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEstimations();
    fetchProjectsList();
    fetchCompanyInfo();
    if (typeof window !== 'undefined') {
      setCurrencySymbol(localStorage.getItem('system_currency_symbol') || 'ج.م');
    }
  }, [fetchEstimations]);

  const handleOpenCreate = () => {
    setEditingEstimation(null);
    setForm({
      project_id: '', tender_name: '', tender_number: '', client_name: '',
      submission_date: '', status: 'draft', overhead_percentage: '15', profit_percentage: '10',
      total_material_cost: '0', total_labor_cost: '0'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (est: Estimation) => {
    setEditingEstimation(est);
    setForm({
      project_id: est.project_id || '',
      tender_name: est.tender_name || '',
      tender_number: est.tender_number || '',
      client_name: est.client_name || '',
      submission_date: est.submission_date ? est.submission_date.split('T')[0] : '',
      status: est.status || 'draft',
      overhead_percentage: String(est.overhead_percentage ?? '15'),
      profit_percentage: String(est.profit_percentage ?? '10'),
      total_material_cost: String(est.total_material_cost ?? '0'),
      total_labor_cost: String(est.total_labor_cost ?? '0')
    });
    setShowModal(true);
  };

  // Calculations
  const material = Number(form.total_material_cost) || 0;
  const labor = Number(form.total_labor_cost) || 0;
  const overheadPercent = Number(form.overhead_percentage) || 0;
  const profitPercent = Number(form.profit_percentage) || 0;

  const baseCost = material + labor;
  const overheadCost = baseCost * (overheadPercent / 100);
  const profitCost = baseCost * (profitPercent / 100);
  const calculatedTotal = baseCost + overheadCost + profitCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingEstimation ? `/api/estimation/${editingEstimation.id}` : '/api/estimation';
      const method = editingEstimation ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          total_material_cost: material,
          total_labor_cost: labor,
          overhead_percentage: overheadPercent,
          profit_percentage: profitPercent,
          total_price: calculatedTotal
        })
      });

      if (res.ok) {
        setShowModal(false);
        fetchEstimations();
      } else {
        const data = await res.json();
        alert(`❌ فشل حفظ عرض السعر: ${data.error || 'حدث خطأ ما'}`);
      }
    } catch (err: any) {
      alert(`❌ خطأ في الاتصال بالخادم: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف عرض السعر هذا نهائياً؟')) return;
    try {
      const res = await fetch(`/api/estimation/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchEstimations();
      } else {
        alert('❌ فشل حذف عرض السعر.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout title="الهندسة والتسعير" subtitle="إدخال مقايسات حصر الكميات (BOQ) وتحديد تكلفة المواد والمصنعيات لتقديم عروض الأسعار" icon="📐">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">📐 عروض أسعار المناقصات والمقايسات</div>
          <div className="page-description">حساب تكلفة المواد والمصنعيات مع نسبة الأرباح والمصاريف النثرية</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleOpenCreate}>+ إنشاء عرض سعر جديد</button>
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
                  <th style={{ textAlign: 'center', width: '180px' }}>العمليات</th>
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
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => handleOpenEdit(est)} title="تعديل عرض السعر">✏️</button>
                        <button className="btn btn-outline btn-sm" onClick={() => setPrintingEstimation(est)} title="طباعة وتحميل PDF">🖨️</button>
                        <button className="btn btn-outline btn-sm text-danger" onClick={() => handleDelete(est.id)} title="حذف عرض السعر">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================== MODAL: ADD / EDIT ESTIMATION ======================== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingEstimation ? '📐 تعديل تفاصيل عرض السعر' : '📐 إنشاء عرض سعر جديد لمناقصة'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid form-grid-3">
                <div className="form-group col-span-3">
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

                <div className="form-group">
                  <label className="form-label">تكلفة المواد الإجمالية ({currencySymbol})</label>
                  <input className="form-control" type="number" value={form.total_material_cost} onChange={e => setForm({...form, total_material_cost: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">تكلفة المصنعية والعمالة الإجمالية ({currencySymbol})</label>
                  <input className="form-control" type="number" value={form.total_labor_cost} onChange={e => setForm({...form, total_labor_cost: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">حالة عرض السعر</label>
                  <select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    {Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              {/* Real-time Calculation Breakdown Summary */}
              <div style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>📊 معاينة الاحتساب المالي الحي:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>التكلفة المباشرة (المواد + العمالة):</span>
                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {formatCurrency(baseCost)}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>المصاريف الإضافية ({overheadPercent}%):</span>
                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--status-warning)', marginTop: '0.2rem' }}>
                      +{formatCurrency(overheadCost)}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>هامش الأرباح المستهدفة ({profitPercent}%):</span>
                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--status-success)', marginTop: '0.2rem' }}>
                      +{formatCurrency(profitCost)}
                    </div>
                  </div>
                  <div style={{ borderRight: '2px solid var(--border-color)', paddingRight: '1rem' }}>
                    <span style={{ color: 'var(--brand-primary-light)', fontWeight: 'bold' }}>السعر النهائي المقترح:</span>
                    <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--status-success)', marginTop: '0.2rem' }}>
                      {formatCurrency(calculatedTotal)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ البيانات والتسعير</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: PRINT PREVIEW ======================== */}
      {printingEstimation && (
        <div className="print-modal-overlay" onClick={() => setPrintingEstimation(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '2rem' }}>
          <div className="print-modal-content" onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            
            <div className="print-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setPrintingEstimation(null)}>✕ إغلاق المعاينة</button>
              <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة عرض السعر</button>
            </div>

            {/* The printable sheet */}
            <div className="print-container" style={{ direction: 'rtl', padding: '1.5rem', background: '#fff', color: '#000', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minHeight: 'auto' }}>
              {/* Style element inside to style print */}
              <style dangerouslySetInnerHTML={{ __html: `
                @page {
                  size: A4;
                  margin: 10mm;
                }
                @media print {
                  html, body {
                    height: 99%;
                    overflow: hidden;
                  }
                  body * {
                    visibility: hidden;
                  }
                  .print-container, .print-container * {
                    visibility: visible !important;
                  }
                  .print-container {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    background: #fff !important;
                    color: #000 !important;
                  }
                  .print-modal-overlay {
                    position: static !important;
                    background: transparent !important;
                    padding: 0 !important;
                    backdrop-filter: none !important;
                    display: block !important;
                  }
                  .print-modal-content {
                    max-height: none !important;
                    overflow: visible !important;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    max-width: 100% !important;
                    animation: none !important;
                  }
                  .print-actions, .modal-header, .tabs, .sidebar, .header, .btn, .nav, .modal-overlay:not(.print-modal-overlay) {
                    display: none !important;
                  }
                }
                .print-header {
                  display: flex;
                  justify-content: space-between;
                  border-bottom: 2px solid #000;
                  padding-bottom: 0.5rem;
                  margin-bottom: 1rem;
                }
                .print-company-info {
                  text-align: right;
                }
                .print-company-title {
                  font-size: 1.25rem;
                  font-weight: bold;
                  margin-bottom: 0.25rem;
                }
                .print-document-title {
                  font-size: 1.5rem;
                  font-weight: bold;
                  text-align: center;
                  margin: 1rem 0;
                  text-decoration: underline;
                }
                .print-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 0.75rem;
                  margin-bottom: 1.25rem;
                  font-size: 0.95rem;
                }
                .print-grid-item {
                  display: flex;
                  gap: 0.5rem;
                }
                .print-grid-label {
                  font-weight: bold;
                  min-width: 110px;
                }
                .print-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 1.25rem;
                }
                .print-table th, .print-table td {
                  border: 1px solid #000;
                  padding: 0.5rem 0.75rem;
                  text-align: right;
                  font-size: 0.95rem;
                }
                .print-table th {
                  background-color: #f2f2f2;
                  font-weight: bold;
                }
                .print-footer {
                  margin-top: 2.5rem;
                  display: flex;
                  justify-content: space-between;
                }
                .print-signature-box {
                  text-align: center;
                  width: 200px;
                  font-size: 0.95rem;
                }
                .print-signature-line {
                  margin-top: 2.5rem;
                  border-top: 1px dashed #000;
                }
              ` }} />

              <div className="print-header">
                <div className="print-company-info">
                  <div className="print-company-title">{companyInfo?.name_ar || 'الرايق للمقاولات الكهروميكانيكية'}</div>
                  <div>سجل تجاري: {companyInfo?.cr_number || '١٠١٠١٢٣٤٥٦'}</div>
                  <div>الرقم الضريبي: {companyInfo?.vat_number || '٣٠٠٠١٢٣٤٥٦٠٠٠٠٣'}</div>
                </div>
                <div style={{ textAlign: 'left', fontSize: '0.9rem' }}>
                  <div>العنوان: {companyInfo?.address || 'القاهرة، مصر'}</div>
                  <div>الهاتف: {companyInfo?.phone || '+20-100-000-0000'}</div>
                  <div>البريد: {companyInfo?.email || 'info@alrayeq.com'}</div>
                </div>
              </div>

              <div className="print-document-title">
                عرض سعر ومقايسة مالية تقديرية
              </div>

              <div className="print-grid">
                <div className="print-grid-item">
                  <span className="print-grid-label">اسم المناقصة:</span>
                  <span>{printingEstimation.tender_name}</span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">رقم المرجع:</span>
                  <span>{printingEstimation.tender_number || '-'}</span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">العميل المستهدف:</span>
                  <span>{printingEstimation.client_name}</span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">تاريخ التقديم:</span>
                  <span>{printingEstimation.submission_date ? new Date(printingEstimation.submission_date).toLocaleDateString('ar-SA') : '-'}</span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">المشروع المرتبط:</span>
                  <span>{printingEstimation.project_name || 'غير مرتبط بمشروع منشأ'}</span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">حالة العرض:</span>
                  <span>{statusLabels[printingEstimation.status] || printingEstimation.status}</span>
                </div>
              </div>

              <table className="print-table">
                <thead>
                  <tr>
                    <th>البند / الوصف المالي</th>
                    <th style={{ width: '220px', textAlign: 'left' }}>القيمة ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>إجمالي قيمة التوريدات والمواد الإنشائية والكهروميكانيكية المباشرة</td>
                    <td style={{ textAlign: 'left' }}>{formatCurrency(printingEstimation.total_material_cost || 0)}</td>
                  </tr>
                  <tr>
                    <td>إجمالي قيمة أعمال التركيب والمصنعيات والعمالة المباشرة في الموقع</td>
                    <td style={{ textAlign: 'left' }}>{formatCurrency(printingEstimation.total_labor_cost || 0)}</td>
                  </tr>
                  <tr style={{ fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                    <td>التكلفة المباشرة الإجمالية (المواد + المصنعيات)</td>
                    <td style={{ textAlign: 'left' }}>{formatCurrency(Number(printingEstimation.total_material_cost || 0) + Number(printingEstimation.total_labor_cost || 0))}</td>
                  </tr>
                  <tr>
                    <td>نسبة المصاريف الإدارية والعمومية الإضافية (Overhead) ({printingEstimation.overhead_percentage || 0}%)</td>
                    <td style={{ textAlign: 'left', color: '#666' }}>
                      +{formatCurrency(
                        (Number(printingEstimation.total_material_cost || 0) + Number(printingEstimation.total_labor_cost || 0)) * 
                        (Number(printingEstimation.overhead_percentage || 0) / 100)
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>نسبة هامش الأرباح المستهدفة المقدرة (Profit) ({printingEstimation.profit_percentage || 0}%)</td>
                    <td style={{ textAlign: 'left', color: '#666' }}>
                      +{formatCurrency(
                        (Number(printingEstimation.total_material_cost || 0) + Number(printingEstimation.total_labor_cost || 0)) * 
                        (Number(printingEstimation.profit_percentage || 0) / 100)
                      )}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 'bold', backgroundColor: '#f2f2f2', fontSize: '1.05rem' }}>
                    <td>السعر النهائي المقترح لعرض السعر (شامل المصاريف والأرباح)</td>
                    <td style={{ textAlign: 'left', border: '4px double #000' }}>{formatCurrency(printingEstimation.total_price || 0)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#555', lineHeight: '1.4' }}>
                <strong>شروط وأحكام عامة:</strong>
                <ul>
                  <li>يعتبر هذا العرض صالحاً لمدة 30 يوماً من تاريخ التقديم المذكور أعلاه.</li>
                  <li>الأسعار المذكورة أعلاه لا تشمل ضريبة القيمة المضافة ما لم يذكر خلاف ذلك في الشروط الخاصة.</li>
                  <li>تتم مراجعة الدفعات وطريقة التسليم والجدول الزمني للأعمال بالتوافق مع شروط المالك واستشاري المشروع.</li>
                </ul>
              </div>

              <div className="print-footer">
                <div className="print-signature-box">
                  <div>أعده (قسم الهندسة والتسعير)</div>
                  <div className="print-signature-line" />
                </div>
                <div className="print-signature-box">
                  <div>راجعه (المدير المالي)</div>
                  <div className="print-signature-line" />
                </div>
                <div className="print-signature-box">
                  <div>اعتمد (المدير العام للمؤسسة)</div>
                  <div className="print-signature-line" />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </AppLayout>
  );
}
