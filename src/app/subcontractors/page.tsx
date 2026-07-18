'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';

type TabType = 'contractors' | 'contracts' | 'ipc';

interface Subcontractor {
  id: string; name: string; specialty: string;
  contact_person: string; phone: string; rating: number;
  is_active: boolean; notes: string;
}

interface SubcontractorIPC {
  id: string;
  ipc_number: string;
  subcontractor_name: string;
  subcontractor_id: string;
  project_id: string;
  ipc_date: string;
  period_from?: string;
  period_to?: string;
  items_total: string;
  retention_amount: string;
  previous_payments?: string;
  net_payable: string;
  status: string;
  notes?: string;
}

const specialtyLabels: Record<string, string> = {
  installation: 'تركيبات', welding: 'لحام', electrical: 'كهرباء',
  plumbing: 'سباكة', testing: 'اختبار', painting: 'دهانات', civil: 'أعمال مدنية', other: 'أخرى'
};
const ipcStatusLabels: Record<string, string> = {
  draft: 'مسودة', submitted: 'مُقدَّم', approved: 'معتمد', paid: 'مدفوع', rejected: 'مرفوض'
};
const ipcStatusBadge: Record<string, string> = {
  draft: 'badge-muted', submitted: 'badge-warning', approved: 'badge-success', paid: 'badge-primary', rejected: 'badge-danger'
};

function formatCurrency(val: string | number) {
  return Number(val).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ج.م';
}

export default function SubcontractorsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('contractors');
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [ipcs, setIpcs] = useState<SubcontractorIPC[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showIpcModal, setShowIpcModal] = useState(false);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Edit & Print States
  const [editingIpc, setEditingIpc] = useState<SubcontractorIPC | null>(null);
  const [printIpc, setPrintIpc] = useState<SubcontractorIPC | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  const [form, setForm] = useState({ name: '', specialty: 'installation', contact_person: '', phone: '', email: '', rating: '4', notes: '' });
  const [ipcForm, setIpcForm] = useState({ ipc_number: '', project_id: '', subcontractor_id: '', period_from: '', period_to: '', items_total: '', retention_amount: '', previous_payments: '', notes: '' });

  const fetchSubcontractors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (specialtyFilter) params.set('specialty', specialtyFilter);
      const res = await fetch(`/api/subcontractors?${params}`);
      const data = await res.json();
      setSubcontractors(Array.isArray(data) ? data : (data?.data ?? []));
    } finally { setLoading(false); }
  }, [search, specialtyFilter]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchIPCs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/subcontractors/ipc?${params}`);
      const data = await res.json();
      setIpcs(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, [statusFilter]);

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
    if (activeTab === 'contractors') fetchSubcontractors();
    else if (activeTab === 'ipc') {
      fetchIPCs();
      fetchSubcontractors();
      fetchProjects();
      fetchCompanyInfo();
    }
  }, [activeTab, fetchSubcontractors, fetchIPCs, fetchProjects]);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/subcontractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ name: '', specialty: 'installation', contact_person: '', phone: '', email: '', rating: '4', notes: '' });
        fetchSubcontractors();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ: ${errData.error || 'فشلت عملية الإضافة'}`);
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleCreateIPC = async () => {
    try {
      const isEdit = !!editingIpc;
      const url = '/api/subcontractors/ipc';
      const method = isEdit ? 'PUT' : 'POST';

      const currentAmt = Number(ipcForm.items_total) || 0;
      const retAmt = Number(ipcForm.retention_amount) || 0;
      const prevAmt = Number(ipcForm.previous_payments) || 0;
      const net = currentAmt - retAmt - prevAmt;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingIpc?.id,
          ipc_number: ipcForm.ipc_number,
          subcontractor_id: ipcForm.subcontractor_id,
          project_id: ipcForm.project_id || null,
          ipc_date: editingIpc ? editingIpc.ipc_date : new Date().toISOString().split('T')[0],
          period_from: ipcForm.period_from || null,
          period_to: ipcForm.period_to || null,
          items_total: currentAmt,
          retention_amount: retAmt,
          previous_payments: prevAmt,
          net_payable: net,
          notes: ipcForm.notes || '',
          status: editingIpc ? editingIpc.status : 'submitted'
        }),
      });
      if (res.ok) {
        setShowIpcModal(false);
        setEditingIpc(null);
        setIpcForm({ ipc_number: '', project_id: '', subcontractor_id: '', period_from: '', period_to: '', items_total: '', retention_amount: '', previous_payments: '', notes: '' });
        fetchIPCs();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء حفظ المستخلص: ${errData.error || 'فشلت عملية الحفظ'}`);
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const totalPending = ipcs.filter(i => i.status === 'submitted').reduce((s, i) => s + Number(i.net_payable), 0);
  const totalPaid = ipcs.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.net_payable), 0);

  return (
    <AppLayout title="مقاولو الباطن والعمالة" subtitle="إدارة عقود مقاولي الباطن ومستخلصاتهم" icon="🤝">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'contractors' ? 'active' : ''}`} onClick={() => setActiveTab('contractors')}>🏢 المقاولون</button>
        <button className={`tab-btn ${activeTab === 'ipc' ? 'active' : ''}`} onClick={() => setActiveTab('ipc')}>📄 المستخلصات</button>
      </div>

      {/* ======================== CONTRACTORS TAB ======================== */}
      {activeTab === 'contractors' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">🏢 قائمة المقاولين</div>
              <div className="page-description">مقاولو الباطن المسجلون في النظام</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ إضافة مقاول</button>
            </div>
          </div>

          <div className="filter-bar">
            <div className="search-input-wrapper" style={{ maxWidth: '300px' }}>
              <span className="search-icon">🔍</span>
              <input className="search-input" placeholder="بحث في المقاولين..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 'auto' }} value={specialtyFilter} onChange={e => setSpecialtyFilter(e.target.value)}>
              <option value="">كل التخصصات</option>
              {Object.entries(specialtyLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Stats */}
          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card">
              <div className="stat-card-icon">🏢</div>
              <div className="stat-value">{subcontractors.length}</div>
              <div className="stat-label">إجمالي المقاولين</div>
            </div>
            <div className="stat-card success">
              <div className="stat-card-icon">✅</div>
              <div className="stat-value">{subcontractors.filter(s => s.is_active).length}</div>
              <div className="stat-label">مقاولون نشطون</div>
            </div>
            <div className="stat-card accent">
              <div className="stat-card-icon">⭐</div>
              <div className="stat-value">{subcontractors.filter(s => s.rating >= 4).length}</div>
              <div className="stat-label">تقييم ممتاز (4+)</div>
            </div>
          </div>

          <div className="card">
            <div className="table-wrapper">
              {loading ? (
                <div className="empty-state"><div className="loading-spinner" /></div>
              ) : subcontractors.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🏢</div>
                  <div className="empty-state-title">لا يوجد مقاولون مسجلون</div>
                  <button className="btn btn-primary" onClick={() => setShowModal(true)}>إضافة أول مقاول</button>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>التخصص</th>
                      <th>مسؤول التواصل</th>
                      <th>الهاتف</th>
                      <th>التقييم</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subcontractors.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                        <td><span className="badge badge-primary">{specialtyLabels[s.specialty] || s.specialty}</span></td>
                        <td>{s.contact_person}</td>
                        <td style={{ direction: 'ltr', textAlign: 'right' }}>{s.phone}</td>
                        <td>{'⭐'.repeat(s.rating || 0)}</td>
                        <td>
                          <span className={`badge ${s.is_active ? 'badge-success' : 'badge-muted'}`}>
                            {s.is_active ? 'نشط' : 'غير نشط'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ======================== IPCs TAB ======================== */}
      {activeTab === 'ipc' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📄 مستخلصات مقاولي الباطن</div>
              <div className="page-description">Interim Payment Certificates للمقاولين</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowIpcModal(true)}>+ مستخلص جديد</button>
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card">
              <div className="stat-card-icon">📄</div>
              <div className="stat-value">{ipcs.length}</div>
              <div className="stat-label">إجمالي المستخلصات</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-card-icon">⏳</div>
              <div className="stat-value">{formatCurrency(totalPending)}</div>
              <div className="stat-label">مبالغ معلقة (ج.م)</div>
            </div>
            <div className="stat-card success">
              <div className="stat-card-icon">💸</div>
              <div className="stat-value">{formatCurrency(totalPaid)}</div>
              <div className="stat-label">مبالغ مدفوعة (ج.م)</div>
            </div>
          </div>

          <div className="filter-bar">
            <select className="form-control" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">كل الحالات</option>
              {Object.entries(ipcStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="card">
            <div className="table-wrapper">
              {loading ? (
                <div className="empty-state"><div className="loading-spinner" /></div>
              ) : ipcs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📄</div>
                  <div className="empty-state-title">لا توجد مستخلصات</div>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم المستخلص</th>
                      <th>المقاول</th>
                      <th>التاريخ</th>
                      <th>الإجمالي</th>
                      <th>الاستقطاع</th>
                      <th>الصافي المستحق</th>
                      <th>الحالة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipcs.map(ipc => (
                      <tr key={ipc.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ipc.ipc_number}</td>
                        <td>{ipc.subcontractor_name}</td>
                        <td>{ipc.ipc_date ? new Date(ipc.ipc_date).toLocaleDateString('ar-SA') : '-'}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{formatCurrency(ipc.items_total)}</td>
                        <td style={{ color: 'var(--status-warning)' }}>{formatCurrency(ipc.retention_amount)}</td>
                        <td style={{ color: 'var(--status-success)', fontWeight: 700 }}>{formatCurrency(ipc.net_payable)}</td>
                        <td><span className={`badge ${ipcStatusBadge[ipc.status] || 'badge-muted'}`}>{ipcStatusLabels[ipc.status] || ipc.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-ghost text-primary btn-sm"
                              onClick={() => {
                                setEditingIpc(ipc);
                                setIpcForm({
                                  ipc_number: ipc.ipc_number,
                                  project_id: ipc.project_id || '',
                                  subcontractor_id: ipc.subcontractor_id || '',
                                  period_from: ipc.period_from ? new Date(ipc.period_from).toISOString().split('T')[0] : '',
                                  period_to: ipc.period_to ? new Date(ipc.period_to).toISOString().split('T')[0] : '',
                                  items_total: ipc.items_total,
                                  retention_amount: ipc.retention_amount,
                                  previous_payments: ipc.previous_payments || '',
                                  notes: ipc.notes || ''
                                });
                                setShowIpcModal(true);
                              }}
                              title="تعديل"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-ghost text-success btn-sm"
                              onClick={() => setPrintIpc(ipc)}
                              title="طباعة"
                            >
                              🖨️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ======================== ADD CONTRACTOR MODAL ======================== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🏢 إضافة مقاول باطن جديد</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-grid form-grid-3">
              <div className="form-group col-span-3">
                <label className="form-label required">اسم المقاول</label>
                <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="شركة النجوم للتركيبات" />
              </div>
              <div className="form-group">
                <label className="form-label required">التخصص</label>
                <select className="form-control" value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})}>
                  {Object.entries(specialtyLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">مسؤول التواصل</label>
                <input className="form-control" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} placeholder="اسم المسؤول" />
              </div>
              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="05xxxxxxxx" />
              </div>
              <div className="form-group col-span-2">
                <label className="form-label">البريد الإلكتروني</label>
                <input className="form-control" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="info@company.com" />
              </div>
              <div className="form-group">
                <label className="form-label">التقييم</label>
                <select className="form-control" value={form.rating} onChange={e => setForm({...form, rating: e.target.value})}>
                  <option value="1">⭐ 1 - ضعيف</option>
                  <option value="2">⭐⭐ 2 - مقبول</option>
                  <option value="3">⭐⭐⭐ 3 - جيد</option>
                  <option value="4">⭐⭐⭐⭐ 4 - جيد جداً</option>
                  <option value="5">⭐⭐⭐⭐⭐ 5 - ممتاز</option>
                </select>
              </div>
              <div className="form-group col-span-3">
                <label className="form-label">ملاحظات</label>
                <textarea className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="أي ملاحظات إضافية..." rows={2} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={handleCreate}>💾 حفظ المقاول</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================== ADD IPC MODAL ======================== */}
      {showIpcModal && (
        <div className="modal-overlay" onClick={() => {
          setShowIpcModal(false);
          setEditingIpc(null);
          setIpcForm({ ipc_number: '', project_id: '', subcontractor_id: '', period_from: '', period_to: '', items_total: '', retention_amount: '', previous_payments: '', notes: '' });
        }}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingIpc ? '✏️ تعديل مستخلص مقاول باطن' : '📄 إصدار مستخلص مقاول باطن'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => {
                setShowIpcModal(false);
                setEditingIpc(null);
                setIpcForm({ ipc_number: '', project_id: '', subcontractor_id: '', period_from: '', period_to: '', items_total: '', retention_amount: '', previous_payments: '', notes: '' });
              }}>✕</button>
            </div>
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label required">مقاول الباطن</label>
                <select className="form-control" required value={ipcForm.subcontractor_id} onChange={e => setIpcForm({...ipcForm, subcontractor_id: e.target.value})}>
                  <option value="">اختر مقاول الباطن...</option>
                  {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({specialtyLabels[s.specialty] || s.specialty})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">المشروع المرتبط</label>
                <select className="form-control" required value={ipcForm.project_id} onChange={e => setIpcForm({...ipcForm, project_id: e.target.value})}>
                  <option value="">اختر المشروع...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">رقم المستخلص</label>
                <input className="form-control" value={ipcForm.ipc_number} onChange={e => setIpcForm({...ipcForm, ipc_number: e.target.value})} placeholder="IPC-001" />
              </div>
              <div className="form-group">
                <label className="form-label">الفترة من</label>
                <input className="form-control" type="date" value={ipcForm.period_from} onChange={e => setIpcForm({...ipcForm, period_from: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">الفترة إلى</label>
                <input className="form-control" type="date" value={ipcForm.period_to} onChange={e => setIpcForm({...ipcForm, period_to: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label required">إجمالي الأعمال (ج.م)</label>
                <input className="form-control" type="number" value={ipcForm.items_total} onChange={e => setIpcForm({...ipcForm, items_total: e.target.value})} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">مبلغ الاستقطاع (ج.م)</label>
                <input className="form-control" type="number" value={ipcForm.retention_amount} onChange={e => setIpcForm({...ipcForm, retention_amount: e.target.value})} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">مدفوعات سابقة (ج.م)</label>
                <input className="form-control" type="number" value={ipcForm.previous_payments} onChange={e => setIpcForm({...ipcForm, previous_payments: e.target.value})} placeholder="0.00" />
              </div>
              {editingIpc && (
                <div className="form-group">
                  <label className="form-label required">حالة المستخلص</label>
                  <select className="form-control" required value={editingIpc.status} onChange={e => setEditingIpc({...editingIpc, status: e.target.value})}>
                    {Object.entries(ipcStatusLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group col-span-3">
                <label className="form-label">ملاحظات</label>
                <textarea className="form-control" value={ipcForm.notes} onChange={e => setIpcForm({...ipcForm, notes: e.target.value})} placeholder="ملاحظات المستخلص..." rows={2} />
              </div>
            </div>
            {ipcForm.items_total && (
              <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>
                💡 <strong>الصافي المستحق:</strong> {formatCurrency(Number(ipcForm.items_total) - Number(ipcForm.retention_amount || 0) - Number(ipcForm.previous_payments || 0))}
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => {
                setShowIpcModal(false);
                setEditingIpc(null);
                setIpcForm({ ipc_number: '', project_id: '', subcontractor_id: '', period_from: '', period_to: '', items_total: '', retention_amount: '', previous_payments: '', notes: '' });
              }}>إلغاء</button>
              <button className="btn btn-primary" onClick={handleCreateIPC}>{editingIpc ? '💾 حفظ التعديلات' : '💾 إصدار المستخلص'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================== PRINT MODAL ======================== */}
      {printIpc && (
        <div className="modal-overlay print-modal-overlay" onClick={() => setPrintIpc(null)}>
          <div className="modal modal-xl print-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', background: 'var(--card-bg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header print-actions" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <div className="modal-title">🖨️ معاينة طباعة مستخلص الباطن</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة المستخلص</button>
                <button className="btn btn-ghost" onClick={() => setPrintIpc(null)}>إغلاق</button>
              </div>
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

              <div className="print-document-title">مستخلص مقاول باطن</div>

              <div className="print-grid">
                <div className="print-grid-item">
                  <span className="print-grid-label">رقم المستخلص:</span>
                  <span>{printIpc.ipc_number}</span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">اسم المقاول:</span>
                  <span>{printIpc.subcontractor_name}</span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">تاريخ المستخلص:</span>
                  <span>{new Date(printIpc.ipc_date).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">الفترة المالية:</span>
                  <span>
                    {printIpc.period_from && printIpc.period_to 
                      ? `من ${new Date(printIpc.period_from).toLocaleDateString('ar-EG')} إلى ${new Date(printIpc.period_to).toLocaleDateString('ar-EG')}` 
                      : 'غير محددة'}
                  </span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">حالة المستخلص:</span>
                  <span>{ipcStatusLabels[printIpc.status] || printIpc.status}</span>
                </div>
              </div>

              <table className="print-table">
                <thead>
                  <tr>
                    <th>الوصف</th>
                    <th style={{ width: '200px', textAlign: 'left' }}>القيمة (ج.م)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>إجمالي الأعمال المنفذة والمعتمدة</td>
                    <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{formatCurrency(printIpc.items_total)}</td>
                  </tr>
                  <tr>
                    <td>خصم نسبة الضمان المالي المقتطع</td>
                    <td style={{ textAlign: 'left', color: '#c00' }}>{formatCurrency(printIpc.retention_amount)}</td>
                  </tr>
                  {Number(printIpc.previous_payments) > 0 && (
                    <tr>
                      <td>خصم مدفوعات سابقة مستلمة</td>
                      <td style={{ textAlign: 'left', color: '#c00' }}>{formatCurrency(printIpc.previous_payments || 0)}</td>
                    </tr>
                  )}
                  <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                    <td>الصافي المستحق الصرف للمقاول</td>
                    <td style={{ textAlign: 'left', fontSize: '1.2rem', color: '#080' }}>
                      {formatCurrency(
                        Number(printIpc.items_total) - 
                        Number(printIpc.retention_amount) - 
                        Number(printIpc.previous_payments || 0)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {printIpc.notes && (
                <div style={{ marginTop: '1.5rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>ملاحظات:</div>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>{printIpc.notes}</p>
                </div>
              )}

              <div className="print-footer">
                <div className="print-signature-box">
                  <div>المقاول المستلم</div>
                  <div className="print-signature-line"></div>
                </div>
                <div className="print-signature-box">
                  <div>مهندس الموقع</div>
                  <div className="print-signature-line"></div>
                </div>
                <div className="print-signature-box">
                  <div>المدير الفني للمشروع</div>
                  <div className="print-signature-line"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
