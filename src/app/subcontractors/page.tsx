'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import PrintA4Template from '@/components/PrintA4Template';
import { formatCurrency } from '@/lib/currencyHelper';
import { exportJsonToExcel } from '@/lib/exportUtils';
import { isReadOnlyRole } from '@/lib/authHelper';

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
  vat_percentage?: string;
  vat_amount?: string;
  retention_percentage?: string;
  retention_amount: string;
  advance_deduction_percentage?: string;
  advance_deduction_amount?: string;
  wht_percentage?: string;
  wht_amount?: string;
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

export default function SubcontractorsPage() {
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');
  const [isReadOnly, setIsReadOnly] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrencySymbol(localStorage.getItem('system_currency_symbol') || 'ج.م');
      setIsReadOnly(isReadOnlyRole(localStorage.getItem('user_role')));
    }
  }, []);
  const [activeTab, setActiveTab] = useState<TabType>('contractors');
  const lastTabRef = useRef<string | null>(null);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    lastTabRef.current = tab;
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${window.location.pathname}?tab=${tab}`);
    }
  };

  useEffect(() => {
    const syncTab = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && tab !== lastTabRef.current && ['contractors', 'contracts', 'ipc'].includes(tab)) {
          lastTabRef.current = tab;
          setActiveTab(tab as TabType);
        }
      }
    };
    syncTab();
    const interval = setInterval(syncTab, 200);
    return () => clearInterval(interval);
  }, []);
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
  const [editingContractor, setEditingContractor] = useState<Subcontractor | null>(null);
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

  const handleOpenCreateContractor = () => {
    setEditingContractor(null);
    setForm({ name: '', specialty: 'installation', contact_person: '', phone: '', email: '', rating: '4', notes: '' });
    setShowModal(true);
  };

  const handleOpenEditContractor = (sub: Subcontractor) => {
    setEditingContractor(sub);
    setForm({
      name: sub.name,
      specialty: sub.specialty || 'installation',
      contact_person: sub.contact_person || '',
      phone: sub.phone || '',
      email: (sub as any).email || '',
      rating: String(sub.rating || '4'),
      notes: sub.notes || ''
    });
    setShowModal(true);
  };

  const handleSaveContractor = async () => {
    try {
      const userRole = localStorage.getItem('user_role') || 'admin';
      const userName = localStorage.getItem('user_name') || 'مستخدم النظام';
      const isEdit = !!editingContractor;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch('/api/subcontractors', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
          'x-user-name': encodeURIComponent(userName)
        },
        body: JSON.stringify({
          id: editingContractor?.id,
          ...form
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setEditingContractor(null);
        setForm({ name: '', specialty: 'installation', contact_person: '', phone: '', email: '', rating: '4', notes: '' });
        if (data.pending_approval) {
          alert(`⏳ ${data.message}`);
        } else {
          alert(isEdit ? '✅ تم تعديل بيانات المقاول بنجاح!' : '✅ تم إضافة المقاول بنجاح!');
        }
        fetchSubcontractors();
      } else {
        alert(`❌ حدث خطأ: ${data.error || 'فشلت عملية الحفظ'}`);
      }
    } catch (e) {
      console.error(e);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleDeleteContractor = async (sub: Subcontractor) => {
    if (!confirm(`هل أنت متأكد من حذف المقاول "${sub.name}"؟`)) return;
    try {
      const userRole = localStorage.getItem('user_role') || 'admin';
      const userName = localStorage.getItem('user_name') || 'مستخدم النظام';

      const res = await fetch(`/api/subcontractors?id=${sub.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': userRole,
          'x-user-name': encodeURIComponent(userName)
        }
      });
      const data = await res.json();
      if (res.ok) {
        if (data.pending_approval) {
          alert(`⏳ ${data.message}`);
        } else {
          alert('✅ تم حذف المقاول بنجاح!');
        }
        fetchSubcontractors();
      } else {
        alert(`❌ فشل الحذف: ${data.error || 'حدث خطأ أثناء التنفيذ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleExportSubIpcsExcel = () => {
    if (ipcs.length === 0) {
      alert('لا توجد مستخلصات باطن لتصديرها.');
      return;
    }
    const exportData = ipcs.map(i => ({
      ipc_number: i.ipc_number,
      subcontractor_name: i.subcontractor_name || '-',
      items_total: Number(i.items_total || 0),
      retention_amount: Number(i.retention_amount || 0),
      previous_payments: Number(i.previous_payments || 0),
      net_payable: Number(i.net_payable || 0),
      status: ipcStatusLabels[i.status] || i.status,
      ipc_date: i.ipc_date ? new Date(i.ipc_date).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-'
    }));

    exportJsonToExcel({
      filename: `مستخلصات_مقاولي_الباطن_${new Date().toISOString().slice(0,10)}`,
      sheetName: 'مستخلصات الباطن',
      data: exportData,
      headers: {
        ipc_number: 'رقم المستخلص',
        subcontractor_name: 'اسم مقاول الباطن',
        items_total: 'قيمة الأعمال الإجمالية',
        retention_amount: 'الضمان المالي المحتجز',
        previous_payments: 'الدفعات السابقة',
        net_payable: 'الصافي المستحق للمقاول',
        status: 'حالة المستخلص',
        ipc_date: 'تاريخ المستخلص'
      }
    });
  };

  const handleExportSingleSubIpcExcel = (ipc: SubcontractorIPC) => {
    const singleData = [{
      ipc_number: ipc.ipc_number,
      subcontractor_name: ipc.subcontractor_name || '-',
      ipc_date: ipc.ipc_date ? new Date(ipc.ipc_date).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-',
      period: `${ipc.period_from ? new Date(ipc.period_from).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : ''} إلى ${ipc.period_to ? new Date(ipc.period_to).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : ''}`,
      items_total: Number(ipc.items_total || 0),
      retention_amount: Number(ipc.retention_amount || 0),
      previous_payments: Number(ipc.previous_payments || 0),
      net_payable: Number(ipc.net_payable || 0),
      status: ipcStatusLabels[ipc.status] || ipc.status,
      notes: ipc.notes || '-'
    }];

    exportJsonToExcel({
      filename: `مستخلص_باطن_${ipc.subcontractor_name}_${ipc.ipc_number}_${new Date().toISOString().slice(0,10)}`,
      sheetName: 'مستخلص مقاول باطن',
      data: singleData,
      headers: {
        ipc_number: 'رقم المستخلص',
        subcontractor_name: 'اسم مقاول الباطن',
        ipc_date: 'تاريخ المستخلص',
        period: 'الفترة المالية',
        items_total: 'إجمالي قيمة الأعمال المنجزة',
        retention_amount: 'استقطاع الضمان المحتجز',
        previous_payments: 'خصم دفعات سابقة',
        net_payable: 'الصافي النهائي المستحق للمقاول',
        status: 'حالة المستخلص',
        notes: 'ملاحظات'
      }
    });
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

  const handleDeleteIPC = async (ipcId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا المستخلص نهائياً؟')) return;
    try {
      const res = await fetch(`/api/subcontractors/ipc?id=${ipcId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ تم حذف المستخلص بنجاح!');
        fetchIPCs();
      } else {
        const err = await res.json();
        alert(`❌ فشل حذف المستخلص: ${err.error || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const totalPending = ipcs.filter(i => i.status === 'submitted').reduce((s, i) => s + Number(i.net_payable), 0);
  const totalPaid = ipcs.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.net_payable), 0);

  return (
    <AppLayout title="مقاولو الباطن والعمالة" subtitle="إدارة عقود مقاولي الباطن ومستخلصاتهم" icon="🤝">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'contractors' ? 'active' : ''}`} onClick={() => handleTabChange('contractors')}>🏢 المقاولون</button>
        <button className={`tab-btn ${activeTab === 'ipc' ? 'active' : ''}`} onClick={() => handleTabChange('ipc')}>📄 المستخلصات</button>
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
              {!isReadOnly && <button className="btn btn-primary" onClick={handleOpenCreateContractor}>+ إضافة مقاول</button>}
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
                  {!isReadOnly && <button className="btn btn-primary" onClick={handleOpenCreateContractor}>إضافة أول مقاول</button>}
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
                      <th style={{ textAlign: 'center' }}>العمليات</th>
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
                        <td style={{ textAlign: 'center' }}>
                          {!isReadOnly ? (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleOpenEditContractor(s)}
                              >
                                ✏️ تعديل
                              </button>
                              <button
                                className="btn btn-outline btn-sm text-danger"
                                onClick={() => handleDeleteContractor(s)}
                              >
                                🗑️ حذف
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>عرض فقط</span>
                          )}
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
            <div className="page-header-actions" style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={handleExportSubIpcsExcel}>📊 تصدير إلى Excel (.xlsx)</button>
              {!isReadOnly && <button className="btn btn-primary" onClick={() => setShowIpcModal(true)}>+ مستخلص جديد</button>}
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
              <div className="stat-label">مبالغ معلقة ({currencySymbol})</div>
            </div>
            <div className="stat-card success">
              <div className="stat-card-icon">💸</div>
              <div className="stat-value">{formatCurrency(totalPaid)}</div>
              <div className="stat-label">مبالغ مدفوعة ({currencySymbol})</div>
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
                        <td>{ipc.ipc_date ? new Date(ipc.ipc_date).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-'}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{formatCurrency(ipc.items_total)}</td>
                        <td style={{ color: 'var(--status-warning)' }}>{formatCurrency(ipc.retention_amount)}</td>
                        <td style={{ color: 'var(--status-success)', fontWeight: 700 }}>{formatCurrency(ipc.net_payable)}</td>
                        <td><span className={`badge ${ipcStatusBadge[ipc.status] || 'badge-muted'}`}>{ipcStatusLabels[ipc.status] || ipc.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {!isReadOnly && <button
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
                            </button>}
                            <button
                              className="btn btn-ghost text-success btn-sm"
                              onClick={() => setPrintIpc(ipc)}
                              title="طباعة"
                            >
                              🖨️
                            </button>
                            {!isReadOnly && <button
                              className="btn btn-ghost text-danger btn-sm"
                              onClick={() => handleDeleteIPC(ipc.id)}
                              title="حذف"
                            >
                              🗑️
                            </button>}
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
              <div className="modal-title">{editingContractor ? '✏️ تعديل بيانات المقاول' : '🏢 إضافة مقاول باطن جديد'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowModal(false); setEditingContractor(null); }}>✕</button>
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
              <button className="btn btn-outline" onClick={() => { setShowModal(false); setEditingContractor(null); }}>إلغاء</button>
              <button className="btn btn-primary" onClick={handleSaveContractor}>💾 {editingContractor ? 'حفظ التعديلات' : 'حفظ المقاول'}</button>
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
                <label className="form-label">رقم المستخلص (اختياري)</label>
                <input className="form-control" value={ipcForm.ipc_number} onChange={e => setIpcForm({...ipcForm, ipc_number: e.target.value})} placeholder="توليد تلقائي تسلسلي (مثال: SC-IPC-0001)" />
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
                <label className="form-label required">إجمالي الأعمال ({currencySymbol})</label>
                <input className="form-control" type="number" value={ipcForm.items_total} onChange={e => setIpcForm({...ipcForm, items_total: e.target.value})} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">مبلغ الاستقطاع ({currencySymbol})</label>
                <input className="form-control" type="number" value={ipcForm.retention_amount} onChange={e => setIpcForm({...ipcForm, retention_amount: e.target.value})} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">مدفوعات سابقة ({currencySymbol})</label>
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
        <div className="modal-overlay print-modal-overlay" onClick={() => setPrintIpc(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '2rem' }}>
          <div className="modal modal-xl print-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', background: '#fff', maxHeight: '92vh', overflowY: 'auto', borderRadius: '12px', padding: '2rem', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <div className="modal-header print-actions" style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={() => setPrintIpc(null)}>✕ إغلاق المعاينة</button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => handleExportSingleSubIpcExcel(printIpc)}>📊 تصدير إلى Excel (.xlsx)</button>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة / حفظ كـ PDF</button>
              </div>
            </div>
            
            {/* The printable sheet with A4 Template */}
            <PrintA4Template
              companyInfo={companyInfo}
              documentTitle="مستخلص مستحقات مقاول باطن"
              refNumber={printIpc.ipc_number}
              documentSubtitle={`المقاول: ${printIpc.subcontractor_name}`}
              date={printIpc.ipc_date ? new Date(printIpc.ipc_date).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : new Date().toLocaleDateString('ar-EG', { calendar: 'gregory' })}
            >
              <div className="print-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>رقم المستخلص:</span>
                  <span>{printIpc.ipc_number}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>اسم المقاول:</span>
                  <span>{printIpc.subcontractor_name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>تاريخ المستخلص:</span>
                  <span>{new Date(printIpc.ipc_date).toLocaleDateString('ar-EG', { calendar: 'gregory' })}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>الفترة المالية:</span>
                  <span>
                    {printIpc.period_from && printIpc.period_to 
                      ? `من ${new Date(printIpc.period_from).toLocaleDateString('ar-EG', { calendar: 'gregory' })} إلى ${new Date(printIpc.period_to).toLocaleDateString('ar-EG', { calendar: 'gregory' })}` 
                      : 'غير محددة'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>حالة المستخلص:</span>
                  <span>{ipcStatusLabels[printIpc.status] || printIpc.status}</span>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.625rem', textAlign: 'right' }}>الوصف المالي</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.625rem', width: '220px', textAlign: 'left' }}>القيمة ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>إجمالي الأعمال المنفذة والمعتمدة في الموقع</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 'bold' }}>{formatCurrency(printIpc.items_total)}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>ضريبة القيمة المضافة ({printIpc.vat_percentage || 14}%)</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left' }}>+{formatCurrency(printIpc.vat_amount || (Number(printIpc.items_total || 0) * 0.14))}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>خصم نسبة الضمان المالي المقتطع ({printIpc.retention_percentage || 10}%)</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#dc2626' }}>-{formatCurrency(printIpc.retention_amount)}</td>
                  </tr>
                  {Number(printIpc.advance_deduction_amount || 0) > 0 && (
                    <tr>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>تصفية وحسم الدفعة المقدمة ({printIpc.advance_deduction_percentage || 0}%)</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#dc2626' }}>-{formatCurrency(printIpc.advance_deduction_amount || 0)}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>خصم ضريبة الأرباح التجارية والصناعية ({printIpc.wht_percentage || 1}%)</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#dc2626' }}>-{formatCurrency(printIpc.wht_amount || (Number(printIpc.items_total || 0) * 0.01))}</td>
                  </tr>
                  {Number(printIpc.previous_payments) > 0 && (
                    <tr>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>خصم مدفوعات سابقة مستلمة</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#dc2626' }}>-{formatCurrency(printIpc.previous_payments || 0)}</td>
                    </tr>
                  )}
                  <tr style={{ backgroundColor: '#eff6ff', fontWeight: 'bold', fontSize: '1.05rem', color: '#1e3a8a' }}>
                    <td style={{ border: '2px solid #1e3a8a', padding: '0.625rem' }}>الصافي المستحق الصرف للمقاول</td>
                    <td style={{ border: '2px solid #1e3a8a', padding: '0.625rem', textAlign: 'left' }}>
                      {formatCurrency(printIpc.net_payable)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {printIpc.notes && (
                <div style={{ marginTop: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: '#1e293b' }}>ملاحظات وشروط المستخلص:</div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{printIpc.notes}</p>
                </div>
              )}
            </PrintA4Template>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
