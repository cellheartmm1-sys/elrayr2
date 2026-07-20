'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import PrintA4Template from '@/components/PrintA4Template';
import { formatCurrency } from '@/lib/currencyHelper';
import { exportJsonToExcel } from '@/lib/exportUtils';

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
  const [printingDocs, setPrintingDocs] = useState<Array<{ id: string; document_name: string; file_url: string }>>([]);

  const [uploadedFiles, setUploadedFiles] = useState<Array<{ key: string; name: string }>>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/employees/upload', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          setUploadedFiles(prev => [...prev, { key: data.key, name: data.filename }]);
        } else {
          alert(`فشل رفع الملف ${file.name}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء رفع الملفات.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveUploadedFile = (keyToRemove: string) => {
    setUploadedFiles(prev => prev.filter(f => f.key !== keyToRemove));
  };

  // Trigger loading documents when printingEstimation is selected
  useEffect(() => {
    if (!printingEstimation) {
      setPrintingDocs([]);
      return;
    }
    const loadDocs = async () => {
      try {
        const res = await fetch(`/api/estimation/${printingEstimation.id}`);
        if (res.ok) {
          const data = await res.json();
          setPrintingDocs(data.documents || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadDocs();
  }, [printingEstimation]);

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
    setUploadedFiles([]);
    setForm({
      project_id: '', tender_name: '', tender_number: '', client_name: '',
      submission_date: '', status: 'draft', overhead_percentage: '15', profit_percentage: '10',
      total_material_cost: '0', total_labor_cost: '0'
    });
    setShowModal(true);
  };

  const handleOpenEdit = async (est: Estimation) => {
    setEditingEstimation(est);
    setUploadedFiles([]);
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

    try {
      const res = await fetch(`/api/estimation/${est.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.documents && Array.isArray(data.documents)) {
          setUploadedFiles(data.documents.map((doc: any) => ({
            key: doc.file_url,
            name: doc.document_name
          })));
        }
      }
    } catch (err) {
      console.error('Failed to fetch estimation documents', err);
    }
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
          total_price: calculatedTotal,
          uploaded_files: uploadedFiles
        })
      });

      if (res.ok) {
        setShowModal(false);
        setUploadedFiles([]);
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

  const handleExportAllExcel = () => {
    if (estimations.length === 0) {
      alert('لا توجد عروض أسعار لتصديرها.');
      return;
    }
    const exportData = estimations.map(est => ({
      tender_number: est.tender_number || '-',
      tender_name: est.tender_name,
      client_name: est.client_name || '-',
      submission_date: est.submission_date ? new Date(est.submission_date).toLocaleDateString('ar-SA') : '-',
      material_cost: Number(est.total_material_cost || 0),
      labor_cost: Number(est.total_labor_cost || 0),
      overhead_percentage: est.overhead_percentage ? `${est.overhead_percentage}%` : '0%',
      profit_percentage: est.profit_percentage ? `${est.profit_percentage}%` : '0%',
      total_price: Number(est.total_price || 0),
      status: statusLabels[est.status] || est.status
    }));

    exportJsonToExcel({
      filename: `جدول_عروض_الأسعار_${new Date().toISOString().slice(0,10)}`,
      sheetName: 'عروض الأسعار',
      data: exportData,
      headers: {
        tender_number: 'رقم المناقصة / المرجع',
        tender_name: 'اسم المناقصة / عرض السعر',
        client_name: 'العميل',
        submission_date: 'تاريخ التقديم',
        material_cost: 'تكلفة المواد',
        labor_cost: 'تكلفة المصنعية',
        overhead_percentage: 'المصاريف الإدارية %',
        profit_percentage: 'نسبة الربح %',
        total_price: 'السعر النهائي الإجمالي',
        status: 'حالة العرض'
      }
    });
  };

  const handleExportSingleExcel = (est: Estimation) => {
    const singleData = [{
      tender_number: est.tender_number || '-',
      tender_name: est.tender_name,
      client_name: est.client_name || '-',
      submission_date: est.submission_date ? new Date(est.submission_date).toLocaleDateString('ar-SA') : '-',
      material_cost: Number(est.total_material_cost || 0),
      labor_cost: Number(est.total_labor_cost || 0),
      overhead_percentage: est.overhead_percentage ? `${est.overhead_percentage}%` : '0%',
      profit_percentage: est.profit_percentage ? `${est.profit_percentage}%` : '0%',
      total_price: Number(est.total_price || 0),
      status: statusLabels[est.status] || est.status
    }];

    exportJsonToExcel({
      filename: `عرض_سعر_${est.tender_number || est.tender_name}_${new Date().toISOString().slice(0,10)}`,
      sheetName: 'عرض سعر',
      data: singleData,
      headers: {
        tender_number: 'رقم المناقصة / المرجع',
        tender_name: 'اسم المناقصة / عرض السعر',
        client_name: 'العميل',
        submission_date: 'تاريخ التقديم',
        material_cost: 'تكلفة المواد',
        labor_cost: 'تكلفة المصنعية والعمالة',
        overhead_percentage: 'المصاريف النثرية %',
        profit_percentage: 'نسبة الربح %',
        total_price: 'الإجمالي التقديري',
        status: 'الحالة الحالية'
      }
    });
  };

  return (
    <AppLayout title="الهندسة والتسعير" subtitle="إدخال مقايسات حصر الكميات (BOQ) وتحديد تكلفة المواد والمصنعيات لتقديم عروض الأسعار" icon="📐">
      <style dangerouslySetInnerHTML={{ __html: `
        .compact-table th, .compact-table td {
          padding: 0.625rem 0.5rem !important;
          font-size: 0.825rem !important;
        }
        .compact-table th {
          font-size: 0.75rem !important;
        }
      ` }} />

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
            <table className="data-table compact-table">
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
                  <th style={{ textAlign: 'center', width: '120px' }}>العمليات</th>
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
          <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div className="modal-title">{editingEstimation ? '📐 تعديل تفاصيل عرض السعر' : '📐 إنشاء عرض سعر جديد لمناقصة'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem' }}>
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
                <div className="form-group col-span-3" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: 'var(--brand-primary-light)' }}>📁 المستندات والملفات المرفقة لعرض السعر (المواصفات، الكتالوجات، الصور)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*,.pdf,.xls,.xlsx" 
                      onChange={handleFileUpload} 
                      disabled={uploading}
                      style={{ display: 'none' }}
                      id="est-file-upload-input"
                    />
                    <label 
                      htmlFor="est-file-upload-input" 
                      className="btn btn-outline" 
                      style={{ cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {uploading ? (
                        <>
                          <span className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                          جاري الرفع...
                        </>
                      ) : '➕ اختر ملفات للرفع'}
                    </label>
                  </div>
                  
                  {uploadedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      {uploadedFiles.map((file) => {
                        const url = `/api/r2-file?key=${encodeURIComponent(file.key)}`;
                        return (
                          <div key={file.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              📎 {file.name}
                            </a>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveUploadedFile(file.key)}
                              style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontWeight: 700 }}
                            >
                              حذف
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
              </div>

              <div className="modal-footer" style={{ flexShrink: 0, borderTop: '1px solid var(--border-normal)', padding: '1rem 1.5rem', marginTop: 0 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ البيانات والتسعير</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: PRINT PREVIEW ======================== */}
      {printingEstimation && (
        <div className="print-modal-overlay" onClick={() => setPrintingEstimation(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '2rem' }}>
          <div className="print-modal-content" onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '900px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            
            <div className="print-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={() => setPrintingEstimation(null)}>✕ إغلاق المعاينة</button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => handleExportSingleExcel(printingEstimation)}>📊 تصدير إلى Excel (.xlsx)</button>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة / حفظ كـ PDF</button>
              </div>
            </div>

            {/* The printable sheet with standard A4 Template */}
            <PrintA4Template
              companyInfo={companyInfo}
              documentTitle="عرض سعر ومقايسة مالية تقديرية"
              refNumber={printingEstimation.tender_number || '-'}
              documentSubtitle={`مناقصة: ${printingEstimation.tender_name}`}
              date={printingEstimation.submission_date ? new Date(printingEstimation.submission_date).toLocaleDateString('ar-SA') : new Date().toLocaleDateString('ar-SA')}
            >
              <div className="print-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>اسم المناقصة:</span>
                  <span>{printingEstimation.tender_name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>رقم المرجع:</span>
                  <span>{printingEstimation.tender_number || '-'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>العميل المستهدف:</span>
                  <span>{printingEstimation.client_name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>تاريخ التقديم:</span>
                  <span>{printingEstimation.submission_date ? new Date(printingEstimation.submission_date).toLocaleDateString('ar-SA') : '-'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>المشروع المرتبط:</span>
                  <span>{printingEstimation.project_name || 'غير مرتبط بمشروع منشأ'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>حالة العرض:</span>
                  <span>{statusLabels[printingEstimation.status] || printingEstimation.status}</span>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.625rem', textAlign: 'right' }}>البند / الوصف المالي</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.625rem', width: '220px', textAlign: 'left' }}>القيمة ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>إجمالي قيمة التوريدات والمواد الإنشائية والكهروميكانيكية المباشرة</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left' }}>{formatCurrency(printingEstimation.total_material_cost || 0)}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>إجمالي قيمة أعمال التركيب والمصنعيات والعمالة المباشرة في الموقع</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left' }}>{formatCurrency(printingEstimation.total_labor_cost || 0)}</td>
                  </tr>
                  <tr style={{ fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>التكلفة المباشرة الإجمالية (المواد + المصنعيات)</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left' }}>{formatCurrency(Number(printingEstimation.total_material_cost || 0) + Number(printingEstimation.total_labor_cost || 0))}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>نسبة المصاريف الإدارية والعمومية الإضافية (Overhead) ({printingEstimation.overhead_percentage || 0}%)</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#666' }}>
                      +{formatCurrency(
                        (Number(printingEstimation.total_material_cost || 0) + Number(printingEstimation.total_labor_cost || 0)) * 
                        (Number(printingEstimation.overhead_percentage || 0) / 100)
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>نسبة هامش الأرباح المستهدفة المقدرة (Profit) ({printingEstimation.profit_percentage || 0}%)</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#666' }}>
                      +{formatCurrency(
                        (Number(printingEstimation.total_material_cost || 0) + Number(printingEstimation.total_labor_cost || 0)) * 
                        (Number(printingEstimation.profit_percentage || 0) / 100)
                      )}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 'bold', backgroundColor: '#eff6ff', fontSize: '1.05rem', color: '#1e3a8a' }}>
                    <td style={{ border: '2px solid #1e3a8a', padding: '0.625rem' }}>السعر النهائي المقترح لعرض السعر (شامل المصاريف والأرباح)</td>
                    <td style={{ border: '2px solid #1e3a8a', padding: '0.625rem', textAlign: 'left' }}>{formatCurrency(printingEstimation.total_price || 0)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#4b5563', lineHeight: '1.5', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#1e293b' }}>شروط وأحكام عامة:</strong>
                <ul style={{ paddingRight: '1.25rem', margin: '0.5rem 0 0 0' }}>
                  <li>يعتبر هذا العرض صالحاً لمدة 30 يوماً من تاريخ التقديم المذكور أعلاه.</li>
                  <li>الأسعار المذكورة أعلاه لا تشمل ضريبة القيمة المضافة ما لم يذكر خلاف ذلك في الشروط الخاصة.</li>
                  <li>تتم مراجعة الدفعات وطريقة التسليم والجدول الزمني للأعمال بالتوافق مع شروط المالك واستشاري المشروع.</li>
                </ul>
              </div>

              {printingDocs.length > 0 && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }} className="print-actions">
                  <strong style={{ fontSize: '0.95rem' }}>📎 الملفات والمستندات المرفقة لعرض السعر:</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {printingDocs.map((doc) => {
                      const url = `/api/r2-file?key=${encodeURIComponent(doc.file_url)}`;
                      return (
                        <a 
                          key={doc.id} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '6px', color: '#333', fontSize: '0.85rem', textDecoration: 'none' }}
                        >
                          <span>📄</span>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{doc.document_name}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </PrintA4Template>

          </div>
        </div>
      )}
    </AppLayout>
  );
}
