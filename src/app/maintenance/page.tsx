'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

type TabType = 'contracts' | 'visits' | 'tickets' | 'assets' | 'scan_qr';

interface MaintenanceContract {
  id: string; contract_number: string; client_name: string; system_type: string;
  start_date: string; end_date: string; annual_value: string; visit_frequency: string; status: string;
}

interface MaintenanceVisit {
  id: string; contract_number: string; client_name: string; scheduled_date: string;
  actual_date: string; technician_name: string; status: string; findings: string;
}

interface FaultTicket {
  id: string; ticket_number: string; client_name: string; site_address: string;
  fault_description: string; urgency: string; technician_name: string; status: string; report_date: string;
}

const statusLabels: Record<string, string> = { active: 'نشط', expired: 'منتهي', cancelled: 'ملغي', renewal_pending: 'بانتظار التجديد' };
const statusBadge: Record<string, string> = { active: 'badge-success', expired: 'badge-danger', cancelled: 'badge-muted', renewal_pending: 'badge-warning' };

const systemLabels: Record<string, string> = {
  fire_pump: 'غرف مضخات الحريق', fire_network: 'شبكات خراطيم الحريق',
  sprinkler: 'أنظمة الرشاشات التلقائية', alarm: 'شبكات إنذار الحريق', all: 'جميع أنظمة الإطفاء والإنذار'
};

const frequencyLabels: Record<string, string> = { monthly: 'شهري', quarterly: 'ربع سنوي', biannual: 'نصف سنوي', annual: 'سنوي' };

const visitStatusLabels: Record<string, string> = { scheduled: 'مجدول', completed: 'تم بنجاح', missed: 'فائت', rescheduled: 'مُعاد جدولته' };
const visitStatusBadge: Record<string, string> = { scheduled: 'badge-primary', completed: 'badge-success', missed: 'badge-danger', rescheduled: 'badge-warning' };

const ticketUrgencyLabels: Record<string, string> = { emergency: 'طارئ جداً', urgent: 'عاجل', normal: 'عادي' };
const ticketUrgencyBadge: Record<string, string> = { emergency: 'badge-danger', urgent: 'badge-warning', normal: 'badge-primary' };

const ticketStatusLabels: Record<string, string> = { open: 'مفتوح', assigned: 'مُسنَد للفني', in_progress: 'جاري العمل', resolved: 'تم الحل', closed: 'مغلق' };
const ticketStatusBadge: Record<string, string> = { open: 'badge-danger', assigned: 'badge-warning', in_progress: 'badge-purple', resolved: 'badge-success', closed: 'badge-muted' };

export default function MaintenancePage() {
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrencySymbol(localStorage.getItem('system_currency_symbol') || 'ج.م');
    }
  }, []);
  const [activeTab, setActiveTab] = useState<TabType>('contracts');
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
        if (tab && tab !== lastTabRef.current && ['contracts', 'visits', 'tickets', 'assets', 'scan_qr'].includes(tab)) {
          lastTabRef.current = tab;
          setActiveTab(tab as TabType);
        }
      }
    };
    syncTab();
    const interval = setInterval(syncTab, 200);
    return () => clearInterval(interval);
  }, []);
  const [contracts, setContracts] = useState<MaintenanceContract[]>([]);
  const [visits, setVisits] = useState<MaintenanceVisit[]>([]);
  const [tickets, setTickets] = useState<FaultTicket[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const [assets, setAssets] = useState<any[]>([]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showQrPrintModal, setShowQrPrintModal] = useState(false);
  const [selectedAssetForPrint, setSelectedAssetForPrint] = useState<any | null>(null);

  // QR Code Search & Mobile Scanner state
  const [qrSearchCode, setQrSearchCode] = useState('');
  const [scannedAsset, setScannedAsset] = useState<any | null>(null);
  const [showInspectionModal, setShowInspectionModal] = useState(false);

  // Forms
  const [contractForm, setContractForm] = useState({
    contract_number: '', client_name: '', client_contact: '', client_phone: '',
    site_address: '', system_type: 'fire_pump', start_date: '', end_date: '',
    annual_value: '', visit_frequency: 'quarterly', status: 'active',
    civil_defense_license_number: '', civil_defense_expiry_date: '', notes: ''
  });

  const [assetForm, setAssetForm] = useState({
    contract_id: '', asset_name: '', category: 'extinguisher', location_details: '',
    last_refill_date: '', next_refill_date: '', status: 'active', notes: ''
  });

  const [inspectionForm, setInspectionForm] = useState({
    asset_id: '', inspector_name: 'فني الصيانة الميدانية', action_type: 'refill',
    findings: '', pressure_status: 'normal', inspection_date: new Date().toISOString().split('T')[0], next_due_date: ''
  });

  const [visitForm, setVisitForm] = useState({
    contract_id: '', scheduled_date: '', technician_id: '', notes: ''
  });

  const [ticketForm, setTicketForm] = useState({
    contract_id: '', client_name: '', site_address: '', reported_by: '', phone: '',
    fault_description: '', urgency: 'normal', status: 'open'
  });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance/assets');
      const data = await res.json();
      setAssets(data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const handleSearchQrCode = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/maintenance/assets?qr_code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (data?.data && data.data.length > 0) {
        setScannedAsset(data.data[0]);
      } else {
        setScannedAsset(null);
        alert('❌ لم يتم العثور على أي طفاية أو معدة بهذا الكود');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.asset_name) { alert('⚠️ يرجى إدخال اسم الطفاية / اللوحة'); return; }
    try {
      const res = await fetch('/api/maintenance/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetForm)
      });
      const data = await res.json();
      if (res.ok) {
        setShowAssetModal(false);
        setAssetForm({
          contract_id: '', asset_name: '', category: 'extinguisher', location_details: '',
          last_refill_date: '', next_refill_date: '', status: 'active', notes: ''
        });
        alert(`✅ ${data.message}`);
        fetchAssets();
      } else {
        alert(`❌ فشل التسجيل: ${data.error || 'حدث خطأ'}`);
      }
    } catch (e) { console.error(e); alert('❌ حدث خطأ بالاتصال'); }
  };

  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionForm.asset_id) return;
    try {
      const res = await fetch('/api/maintenance/assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inspectionForm)
      });
      const data = await res.json();
      if (res.ok) {
        setShowInspectionModal(false);
        alert(`✅ ${data.message}`);
        fetchAssets();
        if (scannedAsset) {
          handleSearchQrCode(scannedAsset.asset_code);
        }
      } else {
        alert(`❌ فشل تسجيل الفحص: ${data.error || 'حدث خطأ'}`);
      }
    } catch (e) { console.error(e); alert('❌ حدث خطأ بالاتصال'); }
  };

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance/contracts');
      const data = await res.json();
      // API returns {data: [...], pagination: {...}}
      setContracts(Array.isArray(data) ? data : (data?.data ?? []));
    } finally { setLoading(false); }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance/visits');
      const data = await res.json();
      setVisits(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance/tickets');
      const data = await res.json();
      setTickets(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as TabType;
      const validTabs: TabType[] = ['contracts', 'visits', 'tickets', 'assets', 'scan_qr'];
      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'contracts') fetchContracts();
    if (activeTab === 'visits') {
      fetchVisits();
      fetchContracts();
      fetchEmployees();
    }
    if (activeTab === 'tickets') fetchTickets();
    if (activeTab === 'assets') {
      fetchAssets();
      fetchContracts();
    }
  }, [activeTab, fetchContracts, fetchVisits, fetchTickets, fetchEmployees, fetchAssets]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/maintenance/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractForm)
      });
      if (res.ok) {
        setShowContractModal(false);
        setContractForm({
          contract_number: '', client_name: '', client_contact: '', client_phone: '',
          site_address: '', system_type: 'fire_pump', start_date: '', end_date: '',
          annual_value: '', visit_frequency: 'quarterly', status: 'active',
          civil_defense_license_number: '', civil_defense_expiry_date: '', notes: ''
        });
        fetchContracts();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء تسجيل العقد: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/maintenance/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitForm)
      });
      if (res.ok) {
        setShowVisitModal(false);
        setVisitForm({ contract_id: '', scheduled_date: '', technician_id: '', notes: '' });
        fetchVisits();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء جدولة الزيارة: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/maintenance/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketForm)
      });
      if (res.ok) {
        setShowTicketModal(false);
        setTicketForm({
          contract_id: '', client_name: '', site_address: '', reported_by: '', phone: '',
          fault_description: '', urgency: 'normal', status: 'open'
        });
        fetchTickets();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء فتح بلاغ العطل: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleContractStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/maintenance/contracts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) fetchContracts();
    } catch (e) { console.error(e); }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف عقد الصيانة هذا؟')) return;
    try {
      const res = await fetch(`/api/maintenance/contracts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ تم حذف العقد بنجاح!');
        fetchContracts();
      }
    } catch (e) { console.error(e); }
  };

  const handleVisitStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/maintenance/visits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) fetchVisits();
    } catch (e) { console.error(e); }
  };

  const handleDeleteVisit = async (id: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف زيارة الصيانة هذه؟')) return;
    try {
      const res = await fetch(`/api/maintenance/visits?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ تم حذف الزيارة بنجاح!');
        fetchVisits();
      }
    } catch (e) { console.error(e); }
  };

  const handleTicketStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/maintenance/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) fetchTickets();
    } catch (e) { console.error(e); }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف بلاغ العطل هذا؟')) return;
    try {
      const res = await fetch(`/api/maintenance/tickets?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ تم حذف البلاغ بنجاح!');
        fetchTickets();
      }
    } catch (e) { console.error(e); }
  };

  // KPIs
  const activeContractsCount = contracts.filter(c => c.status === 'active').length;
  const annualContractsVal = contracts.reduce((acc, c) => acc + Number(c.annual_value || 0), 0);
  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'assigned').length;

  return (
    <AppLayout title="الصيانة والتشغيل" subtitle="إدارة عقود الصيانة الدورية لغرف المضخات وبلاغات الأعطال الطارئة" icon="🔧">
      {/* Civil Defense & Maintenance Expiration Alert Banner */}
      {contracts.some((c: any) => c.civil_defense_alert === 'expiring_soon' || c.civil_defense_alert === 'expired') && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.85rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#991b1b' }}>
          <span style={{ fontSize: '1.5rem' }}>🚨</span>
          <div>
            <div style={{ fontWeight: 'bold' }}>تنبيه تراخيص الدفاع المدني والصيانة الدورية للمنشآت:</div>
            <div style={{ fontSize: '0.9rem' }}>
              يوجد {contracts.filter((c: any) => c.civil_defense_alert === 'expiring_soon' || c.civil_defense_alert === 'expired').length} منشأة/عقد صيانة تقترب أو انتهت تراخيص الدفاع المدني الخاصة بها. يرجى تجديد التراخيص فوراً ومتابعة جدول الزيارات.
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'contracts' ? 'active' : ''}`} onClick={() => handleTabChange('contracts')}>📜 عقود الصيانة والتراخيص</button>
        <button className={`tab-btn ${activeTab === 'visits' ? 'active' : ''}`} onClick={() => handleTabChange('visits')}>📅 زيارات الصيانة الدورية</button>
        <button className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => handleTabChange('tickets')}>🚨 بلاغات الأعطال الطارئة</button>
        <button className={`tab-btn ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => handleTabChange('assets')}>🏷️ سجل الطفايات واللوحات (QR)</button>
        <button className={`tab-btn ${activeTab === 'scan_qr' ? 'active' : ''}`} onClick={() => handleTabChange('scan_qr')}>📱 مسح الـ QR بالموبايل</button>
      </div>

      {/* ======================== TAB: CONTRACTS ======================== */}
      {activeTab === 'contracts' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📜 عقود صيانة غرف المضخات وشبكات الحريق</div>
              <div className="page-description">إدارة ومتابعة عقود ما بعد تسليم المشاريع مع الملاك والشركات</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowContractModal(true)}>+ تسجيل عقد صيانة جديد</button>
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card success">
              <div className="stat-card-icon">📜</div>
              <div className="stat-value">{activeContractsCount}</div>
              <div className="stat-label">عقود صيانة نشطة</div>
            </div>
            <div className="stat-card accent">
              <div className="stat-card-icon">💰</div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(annualContractsVal)}</div>
              <div className="stat-label">القيمة السنوية الإجمالية لعقود الصيانة</div>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : contracts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📜</div>
                <div className="empty-state-title">لا توجد عقود صيانة مسجلة</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم العقد</th>
                      <th>العميل</th>
                      <th>الأنظمة المستهدفة</th>
                      <th>تاريخ البدء</th>
                      <th>تاريخ الانتهاء</th>
                      <th>القيمة السنوية</th>
                      <th>دورية الزيارات</th>
                      <th style={{ textAlign: 'center' }}>الحالة</th>
                      <th style={{ textAlign: 'center' }}>العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 700 }}>{c.contract_number}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.client_name}</td>
                        <td><span className="badge badge-primary">{systemLabels[c.system_type] || c.system_type}</span></td>
                        <td>{new Date(c.start_date).toLocaleDateString('ar-EG')}</td>
                        <td>{new Date(c.end_date).toLocaleDateString('ar-EG')}</td>
                        <td>{formatCurrency(c.annual_value)}</td>
                        <td>{frequencyLabels[c.visit_frequency] || c.visit_frequency}</td>
                        <td style={{ textAlign: 'center' }}>
                          <select
                            className={`form-control form-control-sm ${statusBadge[c.status] || 'badge-muted'}`}
                            style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', fontWeight: 600, cursor: 'pointer', borderRadius: '100px' }}
                            value={c.status}
                            onChange={(e) => handleContractStatusChange(c.id, e.target.value)}
                          >
                            <option value="active">🟢 نشط</option>
                            <option value="renewal_pending">🟡 بانتظار التجديد</option>
                            <option value="expired">🔴 منتهي</option>
                            <option value="cancelled">⚪ ملغي</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-outline btn-sm text-danger"
                            onClick={() => handleDeleteContract(c.id)}
                            title="حذف العقد"
                          >
                            🗑️ حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: VISITS ======================== */}
      {activeTab === 'visits' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📅 زيارات الصيانة المجدولة والمنفذة</div>
              <div className="page-description">تتبع حضور الفنيين للمواقع للكشف على مضخات الحريق والرشاشات ومعدات الإطفاء</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowVisitModal(true)}>+ جدولة زيارة جديدة</button>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : visits.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <div className="empty-state-title">لا توجد زيارات مجدولة حالياً</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>العقد / العميل</th>
                      <th>التاريخ المخطط</th>
                      <th>تاريخ التنفيذ</th>
                      <th>الفني المسؤول</th>
                      <th style={{ textAlign: 'center' }}>الحالة</th>
                      <th>النتائج والملاحظات</th>
                      <th style={{ textAlign: 'center' }}>العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map(v => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.client_name} ({v.contract_number})</td>
                        <td>{new Date(v.scheduled_date).toLocaleDateString('ar-EG')}</td>
                        <td>{v.actual_date ? new Date(v.actual_date).toLocaleDateString('ar-EG') : 'معلق'}</td>
                        <td style={{ fontWeight: 600 }}>{v.technician_name || 'بانتظار التكليف'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <select
                            className={`form-control form-control-sm ${visitStatusBadge[v.status] || 'badge-muted'}`}
                            style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', fontWeight: 600, cursor: 'pointer', borderRadius: '100px' }}
                            value={v.status}
                            onChange={(e) => handleVisitStatusChange(v.id, e.target.value)}
                          >
                            <option value="scheduled">🔵 مجدول</option>
                            <option value="completed">🟢 تم بنجاح</option>
                            <option value="rescheduled">🟡 مُعاد جدولته</option>
                            <option value="missed">🔴 فائت</option>
                          </select>
                        </td>
                        <td>{v.findings || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-outline btn-sm text-danger"
                            onClick={() => handleDeleteVisit(v.id)}
                            title="حذف الزيارة"
                          >
                            🗑️ حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: TICKETS ======================== */}
      {activeTab === 'tickets' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">🚨 بلاغات الأعطال وتصليح الحالات الطارئة</div>
              <div className="page-description">تلقي ومتابعة بلاغات تعطل أنظمة ومضخات الحريق وتكليف فنيي الصيانة الفورية</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-danger" onClick={() => setShowTicketModal(true)}>+ فتح بلاغ طارئ 🚨</button>
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card danger">
              <div className="stat-card-icon">🚨</div>
              <div className="stat-value">{openTicketsCount}</div>
              <div className="stat-label">بلاغات تحت المعالجة</div>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : tickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title">لا توجد بلاغات أعطال مفتوحة حالياً</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم البلاغ</th>
                      <th>العميل</th>
                      <th>الموقع الجغرافي</th>
                      <th>وصف العطل</th>
                      <th>مستوى الأولوية</th>
                      <th>الفني المكلف</th>
                      <th>تاريخ البلاغ</th>
                      <th style={{ textAlign: 'center' }}>حالة المعالجة</th>
                      <th style={{ textAlign: 'center' }}>العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 700 }}>{t.ticket_number}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.client_name}</td>
                        <td>{t.site_address}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{t.fault_description}</td>
                        <td><span className={`badge ${ticketUrgencyBadge[t.urgency] || 'badge-muted'}`}>{ticketUrgencyLabels[t.urgency] || t.urgency}</span></td>
                        <td style={{ fontWeight: 600 }}>{t.technician_name || 'بانتظار التكليف'}</td>
                        <td>{new Date(t.report_date).toLocaleString('ar-EG')}</td>
                        <td style={{ textAlign: 'center' }}>
                          <select
                            className={`form-control form-control-sm ${ticketStatusBadge[t.status] || 'badge-muted'}`}
                            style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', fontWeight: 600, cursor: 'pointer', borderRadius: '100px' }}
                            value={t.status}
                            onChange={(e) => handleTicketStatusChange(t.id, e.target.value)}
                          >
                            <option value="open">🔴 مفتوح</option>
                            <option value="assigned">🟡 مُسنَد للفني</option>
                            <option value="in_progress">🟣 جاري العمل</option>
                            <option value="resolved">🟢 تم الحل</option>
                            <option value="closed">⚪ مغلق</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-outline btn-sm text-danger"
                            onClick={() => handleDeleteTicket(t.id)}
                            title="حذف البلاغ"
                          >
                            🗑️ حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: ASSETS & QR CODES ======================== */}
      {activeTab === 'assets' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">🏷️ سجل الطفايات ولوحات الإنذار والمعدات (QR Code Assets)</div>
              <div className="page-description">تعريف وتتبع أصول المنشآت، توليد رموز الـ QR Code وطباعة الملصقات الميدانية للتعبئة والتأمين</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowAssetModal(true)}>+ تسجيل طفاية / لوحة جديدة</button>
            </div>
          </div>

          <div className="card">
            {assets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏷️</div>
                <div className="empty-state-title">لا توجد طفايات أو معدات مسجلة حالياً</div>
                <button className="btn btn-primary" onClick={() => setShowAssetModal(true)} style={{ marginTop: '1rem' }}>تسجيل أول معدة وتوليد QR Code</button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>كود المعدة / QR</th>
                      <th>اسم المعدة / الطفاية</th>
                      <th>نوع المعدة</th>
                      <th>المشروع / العقد</th>
                      <th>موقع التركيب</th>
                      <th>تاريخ آخر تعبئة</th>
                      <th>تاريخ الفحص القادم</th>
                      <th>الحالة</th>
                      <th style={{ textAlign: 'center' }}>العمليات الميدانية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset: any) => (
                      <tr key={asset.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--brand-primary-light)' }}>{asset.asset_code}</td>
                        <td style={{ fontWeight: 600 }}>{asset.asset_name}</td>
                        <td>
                          {asset.category === 'extinguisher' ? '🧯 طفاية حريق' :
                           asset.category === 'alarm_panel' ? '🚨 لوحة إنذار' :
                           asset.category === 'fire_pump' ? '⚙️ مضخة حريق' : '🔧 معدة سلامة'}
                        </td>
                        <td>{asset.client_name || asset.contract_number || 'عام'}</td>
                        <td>{asset.location_details || '-'}</td>
                        <td>{asset.last_refill_date ? new Date(asset.last_refill_date).toLocaleDateString('ar-EG') : 'لم تفحص'}</td>
                        <td>{asset.next_refill_date ? new Date(asset.next_refill_date).toLocaleDateString('ar-EG') : '-'}</td>
                        <td>
                          {asset.status === 'active' ? <span className="badge badge-success">✅ سليمة وفي الخدمة</span> :
                           asset.status === 'needs_refill' ? <span className="badge badge-danger">🚨 تحتاج تعبئة / فحص</span> :
                           <span className="badge badge-warning">⚠️ تالفة</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => {
                                setSelectedAssetForPrint(asset);
                                setShowQrPrintModal(true);
                              }}
                            >
                              🖨️ ملصق QR
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setInspectionForm({
                                  asset_id: asset.id,
                                  inspector_name: 'فني الصيانة الميدانية',
                                  action_type: 'refill',
                                  findings: '',
                                  pressure_status: 'normal',
                                  inspection_date: new Date().toISOString().split('T')[0],
                                  next_due_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]
                                });
                                setShowInspectionModal(true);
                              }}
                            >
                              ✍️ تسجيل تعبئة
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: MOBILE QR SCANNER ======================== */}
      {activeTab === 'scan_qr' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📱 قارئ الـ QR Code وتسجيل التعبئة الميدانية بالهاتف</div>
              <div className="page-description">أدخل كود الـ QR أو امسحه بواسطة كاميرا الهاتف لعرض سجل الفحص الميداني فوراً</div>
            </div>
          </div>

          <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱 QR</div>
              <h3 style={{ marginBottom: '0.5rem' }}>ماسح رموز الـ QR Code للمعدات والطفايات</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>أدخل كود الطفاية / الرمز المكتوب على الملصق (مثال: EQ-1001) للوصول المباشر لسجل التعبئة</p>

              <form onSubmit={(e) => { e.preventDefault(); handleSearchQrCode(qrSearchCode); }} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input
                  className="form-control"
                  style={{ fontSize: '1.1rem', textAlign: 'center', fontWeight: 'bold' }}
                  placeholder="أدخل رمز الـ QR (مثال: EQ-1001)..."
                  value={qrSearchCode}
                  onChange={e => setQrSearchCode(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>🔍 بحث ومسح</button>
              </form>

              {scannedAsset && (
                <div style={{ textAlign: 'right', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{scannedAsset.asset_name}</h4>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>كود: {scannedAsset.asset_code} | الموقع: {scannedAsset.location_details || 'غير محدد'}</div>
                    </div>
                    <span className={`badge ${scannedAsset.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {scannedAsset.status === 'active' ? '✅ سليمة' : '🚨 تحتاج تعبئة'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تاريخ آخر تعبئة:</div>
                      <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{scannedAsset.last_refill_date ? new Date(scannedAsset.last_refill_date).toLocaleDateString('ar-EG') : 'لا يوجد'}</div>
                    </div>
                    <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>موعد الفحص القادم:</div>
                      <div style={{ fontWeight: 'bold', color: '#d97706' }}>{scannedAsset.next_refill_date ? new Date(scannedAsset.next_refill_date).toLocaleDateString('ar-EG') : 'غير محدد'}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <h5 style={{ marginBottom: '0.5rem' }}>📜 سجل الفحوص والتعبئة السابقة:</h5>
                    {!scannedAsset.inspection_history || scannedAsset.inspection_history.length === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>لا توجد عمليات تعبئة سابقة مسجلة على هذا الـ QR.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                        {scannedAsset.inspection_history.map((h: any, i: number) => (
                          <div key={i} style={{ background: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', borderRight: '3px solid var(--brand-primary-light)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                              <span>{h.action_type === 'refill' ? '🔄 إعادة تعبئة' : '🔍 فحص دوري'} بواسطة: {h.inspector_name}</span>
                              <span>{new Date(h.inspection_date).toLocaleDateString('ar-EG')}</span>
                            </div>
                            {h.findings && <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>ملاحظات: {h.findings}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => {
                      setInspectionForm({
                        asset_id: scannedAsset.id,
                        inspector_name: 'فني الصيانة الميدانية',
                        action_type: 'refill',
                        findings: '',
                        pressure_status: 'normal',
                        inspection_date: new Date().toISOString().split('T')[0],
                        next_due_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]
                      });
                      setShowInspectionModal(true);
                    }}
                  >
                    ✍️ تسجيل تعبئة / فحص ميداني جديد فوراً
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ======================== MODAL: ADD CONTRACT ======================== */}
      {showContractModal && (
        <div className="modal-overlay" onClick={() => setShowContractModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📜 تسجيل عقد صيانة جديد</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowContractModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateContract}>
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label required">رقم العقد</label>
                  <input className="form-control" required value={contractForm.contract_number} onChange={e => setContractForm({...contractForm, contract_number: e.target.value})} placeholder="MNT-2026-xxx" />
                </div>
                <div className="form-group">
                  <label className="form-label required">اسم العميل (الجهة/الشركة)</label>
                  <input className="form-control" required value={contractForm.client_name} onChange={e => setContractForm({...contractForm, client_name: e.target.value})} placeholder="مجمع الاتصالات..." />
                </div>
                <div className="form-group">
                  <label className="form-label">الأنظمة المستهدفة</label>
                  <select className="form-control" value={contractForm.system_type} onChange={e => setContractForm({...contractForm, system_type: e.target.value})}>
                    {Object.entries(systemLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">دورية الزيارات</label>
                  <select className="form-control" value={contractForm.visit_frequency} onChange={e => setContractForm({...contractForm, visit_frequency: e.target.value})}>
                    {Object.entries(frequencyLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                   <label className="form-label required">القيمة السنوية للعام ({currencySymbol})</label>
                  <input className="form-control" type="number" required value={contractForm.annual_value} onChange={e => setContractForm({...contractForm, annual_value: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label required">تاريخ البداية</label>
                  <input className="form-control" type="date" required value={contractForm.start_date} onChange={e => setContractForm({...contractForm, start_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label required">تاريخ النهاية</label>
                  <input className="form-control" type="date" required value={contractForm.end_date} onChange={e => setContractForm({...contractForm, end_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم ترخيص الدفاع المدني</label>
                  <input className="form-control" value={contractForm.civil_defense_license_number} onChange={e => setContractForm({...contractForm, civil_defense_license_number: e.target.value})} placeholder="CD-2026-XXXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ انتهاء ترخيص الدفاع المدني</label>
                  <input className="form-control" type="date" value={contractForm.civil_defense_expiry_date} onChange={e => setContractForm({...contractForm, civil_defense_expiry_date: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowContractModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 تسجيل العقد وتراخيص المنشأة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD VISIT ======================== */}
      {showVisitModal && (
        <div className="modal-overlay" onClick={() => setShowVisitModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📅 جدولة زيارة صيانة جديدة</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowVisitModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateVisit}>
              <div className="form-grid form-grid-3">
                <div className="form-group col-span-3">
                  <label className="form-label required">عقد الصيانة المرتبط</label>
                  <select className="form-control" required value={visitForm.contract_id} onChange={e => setVisitForm({...visitForm, contract_id: e.target.value})}>
                    <option value="">اختر العقد...</option>
                    {contracts.map(c => <option key={c.id} value={c.id}>{c.client_name} ({c.contract_number})</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label required">الفني المكلف بالزيارة</label>
                  <select className="form-control" required value={visitForm.technician_id} onChange={e => setVisitForm({...visitForm, technician_id: e.target.value})}>
                    <option value="">اختر الفني...</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.job_title})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">تاريخ الزيارة المجدول</label>
                  <input className="form-control" type="date" required value={visitForm.scheduled_date} onChange={e => setVisitForm({...visitForm, scheduled_date: e.target.value})} />
                </div>
                <div className="form-group col-span-3">
                  <label className="form-label">ملاحظات الزيارة / نطاق الفحص</label>
                  <textarea className="form-control" value={visitForm.notes} onChange={e => setVisitForm({...visitForm, notes: e.target.value})} placeholder="فحص ضغط مضخات الحريق، اختبار كواشف الدخان..." rows={2} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowVisitModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">📅 جدولة الزيارة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD TICKET ======================== */}
      {showTicketModal && (
        <div className="modal-overlay" onClick={() => setShowTicketModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🚨 فتح بلاغ عطل طارئ</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowTicketModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="form-grid form-grid-3">
                <div className="form-group col-span-3">
                  <label className="form-label required">اسم الجهة/العميل المستغيث</label>
                  <input className="form-control" required value={ticketForm.client_name} onChange={e => setTicketForm({...ticketForm, client_name: e.target.value})} placeholder="مستشفى الشرق الطبي..." />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label required">موقع العطل بالتفصيل</label>
                  <input className="form-control" required value={ticketForm.site_address} onChange={e => setTicketForm({...ticketForm, site_address: e.target.value})} placeholder="مبنى ب - الطابق الأرضي" />
                </div>
                <div className="form-group">
                  <label className="form-label">الأولوية</label>
                  <select className="form-control" value={ticketForm.urgency} onChange={e => setTicketForm({...ticketForm, urgency: e.target.value})}>
                    <option value="normal">عادي</option>
                    <option value="urgent">عاجل</option>
                    <option value="emergency">طارئ جداً 🚨</option>
                  </select>
                </div>
                <div className="form-group col-span-3">
                  <label className="form-label required">تفاصيل العطل والتقرير الأولي</label>
                  <textarea className="form-control" required value={ticketForm.fault_description} onChange={e => setTicketForm({...ticketForm, fault_description: e.target.value})} placeholder="تسريب مياه في صمامات غرف مضخة الحريق مما أدى لانخفاض ضغط الشبكة..." rows={2} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowTicketModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-danger">🚨 إرسال البلاغ فوراً</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD ASSET ======================== */}
      {showAssetModal && (
        <div className="modal-overlay" onClick={() => setShowAssetModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🏷️ تسجيل طفاية / معدة جديدة وتوليد QR Code</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAssetModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateAsset}>
              <div className="form-grid form-grid-2">
                <div className="form-group col-span-2">
                  <label className="form-label required">اسم المعدة / الطفاية</label>
                  <input className="form-control" required value={assetForm.asset_name} onChange={e => setAssetForm({...assetForm, asset_name: e.target.value})} placeholder="طفاية ثاني أكسيد الكربون CO2 سعة 6 كجم..." />
                </div>
                <div className="form-group">
                  <label className="form-label">نوع المعدة</label>
                  <select className="form-control" value={assetForm.category} onChange={e => setAssetForm({...assetForm, category: e.target.value})}>
                    <option value="extinguisher">🧯 طفاية حريق</option>
                    <option value="alarm_panel">🚨 لوحة إنذار</option>
                    <option value="fire_pump">⚙️ مضخة حريق</option>
                    <option value="sprinkler_valve">🚰 صمام رشاشات</option>
                    <option value="other">🔧 معدة أخري</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">عقد الصيانة / المنشأة</label>
                  <select className="form-control" value={assetForm.contract_id} onChange={e => setAssetForm({...assetForm, contract_id: e.target.value})}>
                    <option value="">عام / غير مرتبط بعقد</option>
                    {contracts.map(c => <option key={c.id} value={c.id}>{c.client_name} ({c.contract_number})</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">موقع التركيب بالتفصيل في المنشأة</label>
                  <input className="form-control" value={assetForm.location_details} onChange={e => setAssetForm({...assetForm, location_details: e.target.value})} placeholder="المبنى الرئيسي - بجوار السلم الكهربائي..." />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ آخر تعبئة</label>
                  <input className="form-control" type="date" value={assetForm.last_refill_date} onChange={e => setAssetForm({...assetForm, last_refill_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الفحص القادم المتوقع</label>
                  <input className="form-control" type="date" value={assetForm.next_refill_date} onChange={e => setAssetForm({...assetForm, next_refill_date: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAssetModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 تسجيل وتوليد الـ QR Code</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: PRINT QR STICKER ======================== */}
      {showQrPrintModal && selectedAssetForPrint && (
        <div className="modal-overlay" onClick={() => setShowQrPrintModal(false)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🖨️ معاينة ملصق الـ QR Code للمعدة</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowQrPrintModal(false)}>✕</button>
            </div>
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: '#fff', borderRadius: '12px', border: '2px dashed #cbd5e1', margin: '0.5rem 0' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e3a8a' }}>شركة الرايق للمقاولات الكهروميكانيكية</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>أنظمة السلامة ومكافحة الحريق</div>
              
              <div style={{ margin: '1.25rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                <div style={{ border: '4px solid #000', padding: '0.75rem', borderRadius: '12px', background: '#f8fafc', display: 'inline-block' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '2px', color: '#000' }}>
                    [ QR: {selectedAssetForPrint.asset_code} ]
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#475569', marginTop: '0.25rem' }}>
                    {selectedAssetForPrint.asset_code}
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{selectedAssetForPrint.asset_name}</div>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>الموقع: {selectedAssetForPrint.location_details || 'عام'}</div>
              <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '0.5rem', fontWeight: 'bold' }}>
                تاريخ الفحص القادم: {selectedAssetForPrint.next_refill_date ? new Date(selectedAssetForPrint.next_refill_date).toLocaleDateString('ar-EG') : 'غير محدد'}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowQrPrintModal(false)}>إغلاق</button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة الملصق الآن</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD FIELD INSPECTION ======================== */}
      {showInspectionModal && (
        <div className="modal-overlay" onClick={() => setShowInspectionModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">✍️ تسجيل فحص وتعبئة ميدانية فورية</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowInspectionModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveInspection}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label required">اسم الفني المكلف</label>
                  <input className="form-control" required value={inspectionForm.inspector_name} onChange={e => setInspectionForm({...inspectionForm, inspector_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">نوع الإجراء الميداني</label>
                  <select className="form-control" value={inspectionForm.action_type} onChange={e => setInspectionForm({...inspectionForm, action_type: e.target.value})}>
                    <option value="refill">🔄 إعادة تعبئة طفاية</option>
                    <option value="inspection">🔍 فحص وتشغيل دوري</option>
                    <option value="pressure_test">⚖️ اختبار ضغط هيدروستاتيكي</option>
                    <option value="repair">🔧 إصلاح واستبدال صمام</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">حالة مؤشر الضغط</label>
                  <select className="form-control" value={inspectionForm.pressure_status} onChange={e => setInspectionForm({...inspectionForm, pressure_status: e.target.value})}>
                    <option value="normal">🟢 ضغط ممتاز (سليم)</option>
                    <option value="low">🟡 ضغط منخفض (تحتاج تعبئة)</option>
                    <option value="high">🔴 ضغط مرتفع جداً</option>
                    <option value="failed">❌ المؤشر تالف</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الصيانة القادمة المستحقة</label>
                  <input className="form-control" type="date" value={inspectionForm.next_due_date} onChange={e => setInspectionForm({...inspectionForm, next_due_date: e.target.value})} />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">تقرير الفحص والنتيجة الميدانية</label>
                  <textarea className="form-control" rows={3} value={inspectionForm.findings} onChange={e => setInspectionForm({...inspectionForm, findings: e.target.value})} placeholder="تم إعادة التعبئة بمسحوق بودرة كيميائية ناعمة واختبار تسريب الضغط بنجاح..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowInspectionModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ التعبئة وتحديث سجل الـ QR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
