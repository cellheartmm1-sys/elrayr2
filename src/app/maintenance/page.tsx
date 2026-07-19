'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

type TabType = 'contracts' | 'visits' | 'tickets';

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
        if (tab && tab !== lastTabRef.current && ['contracts', 'visits', 'tickets'].includes(tab)) {
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

  // Forms
  const [contractForm, setContractForm] = useState({
    contract_number: '', client_name: '', client_contact: '', client_phone: '',
    site_address: '', system_type: 'fire_pump', start_date: '', end_date: '',
    annual_value: '', visit_frequency: 'quarterly', status: 'active', notes: ''
  });

  const [visitForm, setVisitForm] = useState({
    contract_id: '', scheduled_date: '', technician_id: '', notes: ''
  });

  const [ticketForm, setTicketForm] = useState({
    contract_id: '', client_name: '', site_address: '', reported_by: '', phone: '',
    fault_description: '', urgency: 'normal', status: 'open'
  });

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
      const validTabs: TabType[] = ['contracts', 'visits', 'tickets'];
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
  }, [activeTab, fetchContracts, fetchVisits, fetchTickets, fetchEmployees]);

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
          annual_value: '', visit_frequency: 'quarterly', status: 'active', notes: ''
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

  // KPIs
  const activeContractsCount = contracts.filter(c => c.status === 'active').length;
  const annualContractsVal = contracts.reduce((acc, c) => acc + Number(c.annual_value || 0), 0);
  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'assigned').length;

  return (
    <AppLayout title="الصيانة والتشغيل" subtitle="إدارة عقود الصيانة الدورية لغرف المضخات وبلاغات الأعطال الطارئة" icon="🔧">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'contracts' ? 'active' : ''}`} onClick={() => handleTabChange('contracts')}>📜 عقود الصيانة</button>
        <button className={`tab-btn ${activeTab === 'visits' ? 'active' : ''}`} onClick={() => handleTabChange('visits')}>📅 زيارات الصيانة الدورية</button>
        <button className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => handleTabChange('tickets')}>🚨 بلاغات الأعطال الطارئة</button>
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
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 700 }}>{c.contract_number}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.client_name}</td>
                        <td><span className="badge badge-primary">{systemLabels[c.system_type] || c.system_type}</span></td>
                        <td>{new Date(c.start_date).toLocaleDateString('ar-SA')}</td>
                        <td>{new Date(c.end_date).toLocaleDateString('ar-SA')}</td>
                        <td>{formatCurrency(c.annual_value)}</td>
                        <td>{frequencyLabels[c.visit_frequency] || c.visit_frequency}</td>
                        <td><span className={`badge ${statusBadge[c.status] || 'badge-muted'}`}>{statusLabels[c.status] || c.status}</span></td>
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
                      <th>الحالة</th>
                      <th>النتائج والملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map(v => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.client_name} ({v.contract_number})</td>
                        <td>{new Date(v.scheduled_date).toLocaleDateString('ar-SA')}</td>
                        <td>{v.actual_date ? new Date(v.actual_date).toLocaleDateString('ar-SA') : 'معلق'}</td>
                        <td style={{ fontWeight: 600 }}>{v.technician_name || 'بانتظار التكليف'}</td>
                        <td><span className={`badge ${visitStatusBadge[v.status] || 'badge-muted'}`}>{visitStatusLabels[v.status] || v.status}</span></td>
                        <td>{v.findings || '-'}</td>
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
                      <th>حالة المعالجة</th>
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
                        <td>{new Date(t.report_date).toLocaleString('ar-SA')}</td>
                        <td><span className={`badge ${ticketStatusBadge[t.status] || 'badge-muted'}`}>{ticketStatusLabels[t.status] || t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowContractModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 تسجيل العقد</button>
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
    </AppLayout>
  );
}
