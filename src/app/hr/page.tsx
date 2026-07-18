'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';

type TabType = 'employees' | 'payroll' | 'attendance' | 'overtime' | 'assets' | 'documents';

interface Employee {
  id: string; employee_number: string; full_name: string; job_title: string;
  nationality: string; base_salary: string; employment_type: string; status: string;
  phone: string; iqama_number: string; iqama_expiry: string;
}

interface PayrollItem {
  id: string; employee_name: string; base_salary: string; housing_allowance: string;
  transport_allowance: string; overtime_amount: string; deductions: string; net_salary: string; status: string;
}

interface AttendanceRecord {
  id: string; employee_name: string; project_name: string; attendance_date: string;
  check_in_time: string; check_out_time: string; attendance_type: string; overtime_hours: number;
}

interface OvertimeRequest {
  id: string; employee_name: string; project_name: string; overtime_date: string;
  hours_requested: number; reason: string; status: string;
}

interface PersonalAsset {
  id: string; asset_code: string; asset_name: string; asset_type: string;
  brand: string; employee_name: string; project_name: string; condition: string; status: string;
}

interface DocumentAlert {
  full_name: string; employee_number: string; document_type: string;
  document_number: string; expiry_date: string; days_remaining: number; alert_status: string;
}

const statusLabels: Record<string, string> = { active: 'نشط', inactive: 'غير نشط', on_leave: 'في إجازة', terminated: 'مستقيل/مفصول' };
const statusBadge: Record<string, string> = { active: 'badge-success', inactive: 'badge-muted', on_leave: 'badge-warning', terminated: 'badge-danger' };

const typeLabels: Record<string, string> = { full_time: 'دوام كامل', part_time: 'دوام جزئي', contract: 'عقد مؤقت', daily: 'يومية' };
const typeBadge: Record<string, string> = { full_time: 'badge-primary', part_time: 'badge-purple', contract: 'badge-warning', daily: 'badge-success' };

const docLabels: Record<string, string> = {
  iqama: 'إقامة', passport: 'جواز سفر', osha: 'شهادة أوشا (OSHA)', driving_license: 'رخصة قيادة',
  vehicle_license: 'رخصة معدة/سيارة', health_card: 'بطاقة صحية', contract: 'عقد العمل'
};

function formatCurrency(val: string | number) {
  return Number(val).toLocaleString('ar-EG') + ' ج.م';
}

export default function HRPage() {
  const [activeTab, setActiveTab] = useState<TabType>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payroll, setPayroll] = useState<PayrollItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [overtime, setOvertime] = useState<OvertimeRequest[]>([]);
  const [assets, setAssets] = useState<PersonalAsset[]>([]);
  const [documents, setDocuments] = useState<DocumentAlert[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState('all');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  // Forms
  const [empForm, setEmpForm] = useState({
    employee_number: '', full_name: '', full_name_en: '', nationality: 'سعودي', id_number: '',
    iqama_number: '', iqama_expiry: '', passport_number: '', passport_expiry: '', job_title: '',
    employment_type: 'full_time', base_salary: '', housing_allowance: '', transport_allowance: '',
    other_allowances: '', bank_account: '', bank_name: '', iban: '', phone: '', email: '', status: 'active'
  });

  const [assetForm, setAssetForm] = useState({
    asset_code: '', asset_name: '', asset_type: 'tool', brand: '', model: '',
    serial_number: '', purchase_cost: '', condition: 'good', status: 'available'
  });

  // Fetch functions
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (empStatusFilter !== 'all') params.set('status', empStatusFilter);
    if (search) params.set('search', search);
    try {
      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      setEmployees(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, [empStatusFilter, search]);

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/payroll?month=${month}&year=${year}`);
      const data = await res.json();
      setPayroll(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, [month, year]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedProject) params.set('project_id', selectedProject);
    try {
      const res = await fetch(`/api/hr/attendance?${params}`);
      const data = await res.json();
      setAttendance(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, [selectedProject]);

  const fetchOvertime = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/overtime');
      const data = await res.json();
      setOvertime(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/assets');
      const data = await res.json();
      setAssets(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, []);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/documents');
      const data = await res.json();
      setDocuments(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, []);

  const fetchProjectsList = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  };

  useEffect(() => {
    fetchProjectsList();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as TabType;
      const validTabs: TabType[] = ['employees', 'payroll', 'attendance', 'overtime', 'assets', 'documents'];
      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'employees') fetchEmployees();
    if (activeTab === 'payroll') fetchPayroll();
    if (activeTab === 'attendance') fetchAttendance();
    if (activeTab === 'overtime') fetchOvertime();
    if (activeTab === 'assets') fetchAssets();
    if (activeTab === 'documents') fetchDocuments();
  }, [activeTab, fetchEmployees, fetchPayroll, fetchAttendance, fetchOvertime, fetchAssets, fetchDocuments]);

  // Actions
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empForm)
      });
      if (res.ok) {
        setShowEmpModal(false);
        setEmpForm({
          employee_number: '', full_name: '', full_name_en: '', nationality: 'سعودي', id_number: '',
          iqama_number: '', iqama_expiry: '', passport_number: '', passport_expiry: '', job_title: '',
          employment_type: 'full_time', base_salary: '', housing_allowance: '', transport_allowance: '',
          other_allowances: '', bank_account: '', bank_name: '', iban: '', phone: '', email: '', status: 'active'
        });
        fetchEmployees();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء إضافة الموظف: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hr/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetForm)
      });
      if (res.ok) {
        setShowAssetModal(false);
        setAssetForm({
          asset_code: '', asset_name: '', asset_type: 'tool', brand: '', model: '',
          serial_number: '', purchase_cost: '', condition: 'good', status: 'available'
        });
        fetchAssets();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء حفظ العهدة: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleOvertimeAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/hr/overtime`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: action })
      });
      if (res.ok) fetchOvertime();
    } catch (err) { console.error(err); }
  };

  const handleGeneratePayroll = async () => {
    if (!confirm(`هل تريد توليد كشف رواتب شهر ${month}-${year}؟`)) return;
    try {
      const res = await fetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year })
      });
      if (res.ok) fetchPayroll();
    } catch (err) { console.error(err); }
  };

  const totalPayrollCost = payroll.reduce((acc, p) => acc + Number(p.net_salary || 0), 0);

  return (
    <AppLayout title="إدارة الموارد البشرية" subtitle="إدارة شؤون الموظفين، الرواتب، العهد، الحضور، وتراخيص OSHA" icon="👨‍💼">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>👨‍💼 الموظفون</button>
        <button className={`tab-btn ${activeTab === 'payroll' ? 'active' : ''}`} onClick={() => setActiveTab('payroll')}>💳 الرواتب وهيكلة الأجور</button>
        <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>📍 حضور المواقع (GPS)</button>
        <button className={`tab-btn ${activeTab === 'overtime' ? 'active' : ''}`} onClick={() => setActiveTab('overtime')}>⏰ الموافقات الإضافية</button>
        <button className={`tab-btn ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => setActiveTab('assets')}>🔨 العهد الشخصية</button>
        <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>📜 تنبيهات الوثائق</button>
      </div>

      {/* ======================== TAB: EMPLOYEES ======================== */}
      {activeTab === 'employees' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">👨‍💼 شؤون الموظفين</div>
              <div className="page-description">إدارة كادر العمل من مهندسين وفنيين لحام وتركيبات ومشرفين</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowEmpModal(true)}>+ إضافة موظف جديد</button>
            </div>
          </div>

          <div className="filter-bar">
            <div className="search-input-wrapper" style={{ maxWidth: '300px' }}>
              <span className="search-icon">🔍</span>
              <input className="search-input" placeholder="بحث باسم الموظف أو الرقم الوظيفي..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 'auto' }} value={empStatusFilter} onChange={e => setEmpStatusFilter(e.target.value)}>
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="on_leave">في إجازة</option>
            </select>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : employees.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍💼</div>
                <div className="empty-state-title">لا يوجد موظفون مسجلون</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الرقم الوظيفي</th>
                      <th>الاسم</th>
                      <th>المسمى الوظيفي</th>
                      <th>الجنسية</th>
                      <th>الراتب الأساسي</th>
                      <th>نوع التوظيف</th>
                      <th>الهاتف</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td style={{ fontWeight: 700 }}>{emp.employee_number}</td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{emp.full_name}</td>
                        <td>{emp.job_title}</td>
                        <td>{emp.nationality || '-'}</td>
                        <td>{formatCurrency(emp.base_salary)}</td>
                        <td><span className={`badge ${typeBadge[emp.employment_type] || 'badge-muted'}`}>{typeLabels[emp.employment_type] || emp.employment_type}</span></td>
                        <td>{emp.phone || '-'}</td>
                        <td><span className={`badge ${statusBadge[emp.status] || 'badge-muted'}`}>{statusLabels[emp.status] || emp.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: PAYROLL ======================== */}
      {activeTab === 'payroll' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">💳 مسيرات الرواتب وتوزيع التكاليف</div>
              <div className="page-description">توزيع تكلفة رواتب المهندسين والعمال على المشاريع لتحليل ربحية كل مشروع بدقة</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-success" onClick={handleGeneratePayroll}>⚡ احتساب المسير للشهر الحالي</button>
            </div>
          </div>

          <div className="filter-bar">
            <select className="form-control" style={{ width: 'auto' }} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1} - شهر</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={year} onChange={e => setYear(Number(e.target.value))}>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card success">
              <div className="stat-card-icon">💸</div>
              <div className="stat-value">{formatCurrency(totalPayrollCost)}</div>
              <div className="stat-label">إجمالي الرواتب واليوميات لهذا الشهر</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon">📊</div>
              <div className="stat-value">{payroll.length}</div>
              <div className="stat-label">موظفين مدرجين بالمسير</div>
            </div>
          </div>

          <div className="card">
            {payroll.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💸</div>
                <div className="empty-state-title">لا توجد بيانات مسيرة لهذا الشهر</div>
                <button className="btn btn-outline" style={{ marginTop: '0.5rem' }} onClick={handleGeneratePayroll}>توليد المسير الآن</button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الموظف</th>
                      <th>الراتب الأساسي</th>
                      <th>السكن والنقل</th>
                      <th>العمل الإضافي</th>
                      <th>الخصومات</th>
                      <th>صافي الراتب المستحق</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payroll.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.employee_name}</td>
                        <td>{formatCurrency(p.base_salary)}</td>
                        <td>{formatCurrency(Number(p.housing_allowance || 0) + Number(p.transport_allowance || 0))}</td>
                        <td style={{ color: 'var(--status-success)' }}>+{formatCurrency(p.overtime_amount)}</td>
                        <td style={{ color: 'var(--status-danger)' }}>-{formatCurrency(p.deductions)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(p.net_salary)}</td>
                        <td><span className="badge badge-success">معتمد</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: ATTENDANCE ======================== */}
      {activeTab === 'attendance' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📍 حضور وانصراف المواقع الجغرافي (GPS)</div>
              <div className="page-description">إثبات حضور الفنيين والعمال في نقاط العمل والمشاريع المحددة جغرافيًا</div>
            </div>
          </div>

          <div className="filter-bar">
            <select className="form-control" style={{ width: 'auto' }} value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
              <option value="">كل المواقع والمشاريع</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="card">
            {attendance.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📍</div>
                <div className="empty-state-title">لا توجد سجلات حضور اليوم في الموقع المحدد</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الموظف</th>
                      <th>الموقع / المشروع</th>
                      <th>التاريخ</th>
                      <th>وقت الحضور</th>
                      <th>وقت الانصراف</th>
                      <th>الحالة</th>
                      <th>ساعات إضافي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.employee_name}</td>
                        <td>{a.project_name || 'المكتب الرئيسي'}</td>
                        <td>{new Date(a.attendance_date).toLocaleDateString('ar-SA')}</td>
                        <td style={{ color: 'var(--status-success)', fontFeatureSettings: '"tnum"' }}>
                          {a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td style={{ color: 'var(--status-warning)', fontFeatureSettings: '"tnum"' }}>
                          {a.check_out_time ? new Date(a.check_out_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td>
                          <span className={`badge ${a.attendance_type === 'present' ? 'badge-success' : a.attendance_type === 'late' ? 'badge-warning' : 'badge-danger'}`}>
                            {a.attendance_type === 'present' ? 'حاضر (GPS)' : a.attendance_type === 'late' ? 'متأخر' : 'غياب'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--status-purple)', fontWeight: 600 }}>{a.overtime_hours || 0} س</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: OVERTIME ======================== */}
      {activeTab === 'overtime' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">⏰ اعتمادات الأجور والساعات الإضافية للمشاريع</div>
              <div className="page-description">طلبات الساعات الإضافية للمواقع التي تعمل بوردية ليلية لتسليم المشاريع</div>
            </div>
          </div>

          <div className="card">
            {overtime.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title">لا توجد طلبات عمل إضافي معلقة للموافقة</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الموظف</th>
                      <th>الموقع</th>
                      <th>التاريخ</th>
                      <th>الساعات المطلوبة</th>
                      <th>السبب</th>
                      <th>الحالة</th>
                      <th style={{ textAlign: 'center' }}>العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overtime.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.employee_name}</td>
                        <td>{o.project_name || 'غير محدد'}</td>
                        <td>{new Date(o.overtime_date).toLocaleDateString('ar-SA')}</td>
                        <td style={{ fontWeight: 700, color: 'var(--status-success)' }}>{o.hours_requested} ساعة</td>
                        <td>{o.reason || '-'}</td>
                        <td>
                          <span className={`badge ${o.status === 'pending' ? 'badge-warning' : o.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                            {o.status === 'pending' ? 'معلق' : o.status === 'approved' ? 'مقبول' : 'مرفوض'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {o.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button className="btn btn-success btn-sm" onClick={() => handleOvertimeAction(o.id, 'approved')}>✔️ موافقة</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleOvertimeAction(o.id, 'rejected')}>✕ رفض</button>
                            </div>
                          )}
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

      {/* ======================== TAB: ASSETS ======================== */}
      {activeTab === 'assets' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">🔨 تتبع العهد الشخصية (Asset Tracking)</div>
              <div className="page-description">تتبع أجهزة اختبار شبكات الحريق والصواريخ واللابتوبات والسيارات المسلمة للمهندسين والمشرفين</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowAssetModal(true)}>+ تسجيل عهدة جديدة</button>
            </div>
          </div>

          <div className="card">
            {assets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔨</div>
                <div className="empty-state-title">لا توجد عهد مسجلة في النظام</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>كود العهدة</th>
                      <th>اسم العهدة</th>
                      <th>النوع</th>
                      <th>الماركة</th>
                      <th>المستلم الحالي</th>
                      <th>الموقع الحالي</th>
                      <th>الحالة الفنية</th>
                      <th>حالة العهدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 700 }}>{a.asset_code}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.asset_name}</td>
                        <td>{a.asset_type}</td>
                        <td>{a.brand || '-'}</td>
                        <td style={{ color: 'var(--brand-primary-light)' }}>{a.employee_name || 'بالمخزن الرئيسي'}</td>
                        <td>{a.project_name || '-'}</td>
                        <td>{a.condition}</td>
                        <td>
                          <span className={`badge ${a.status === 'available' ? 'badge-success' : a.status === 'assigned' ? 'badge-primary' : 'badge-warning'}`}>
                            {a.status === 'available' ? 'متوفرة بالمخزن' : 'مُسلمة للموظف'}
                          </span>
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

      {/* ======================== TAB: DOCUMENTS ======================== */}
      {activeTab === 'documents' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📜 الوثائق والتراخيص وتنبيهات الانتهاء</div>
              <div className="page-description">تنبيهات بانتهاء الإقامات، شهادات السلامة (OSHA)، ورخص السائقين والمعدات الكبيرة في المشاريع</div>
            </div>
          </div>

          {documents.some(d => d.days_remaining <= 30) && (
            <div className="alert alert-warning mb-4">
              ⚠️ <strong>تنبيه انتهاء وثائق:</strong> توجد وثائق عمل وإقامات وشهادات سلامة وصحة مهنية (OSHA) قاربت صلاحيتها على الانتهاء، يرجى التنسيق فوراً لتجديدها لتجنب توقف الأعمال في المواقع.
            </div>
          )}

          <div className="card">
            {documents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📜</div>
                <div className="empty-state-title">لا توجد سجلات تراخيص مسجلة</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>اسم الموظف</th>
                      <th>نوع الوثيقة</th>
                      <th>رقم الوثيقة</th>
                      <th>تاريخ الانتهاء</th>
                      <th>أيام متبقية</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.full_name}</td>
                        <td><span className="badge badge-primary">{docLabels[d.document_type] || d.document_type}</span></td>
                        <td>{d.document_number || '-'}</td>
                        <td>{d.expiry_date ? new Date(d.expiry_date).toLocaleDateString('ar-SA') : '-'}</td>
                        <td style={{ fontWeight: 700, color: d.days_remaining <= 30 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                          {d.days_remaining} يوم
                        </td>
                        <td>
                          <span className={`badge ${d.days_remaining <= 0 ? 'badge-danger' : d.days_remaining <= 30 ? 'badge-warning' : 'badge-success'}`}>
                            {d.days_remaining <= 0 ? 'منتهية' : d.days_remaining <= 30 ? 'تنتهي قريباً' : 'صالحة'}
                          </span>
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

      {/* ======================== MODAL: ADD EMPLOYEE ======================== */}
      {showEmpModal && (
        <div className="modal-overlay" onClick={() => setShowEmpModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">👨‍💼 إضافة موظف جديد</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEmpModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateEmployee}>
              <div className="form-grid form-grid-4">
                <div className="form-group">
                  <label className="form-label required">الرقم الوظيفي</label>
                  <input className="form-control" required value={empForm.employee_number} onChange={e => setEmpForm({...empForm, employee_number: e.target.value})} placeholder="EMP-001" />
                </div>
                <div className="form-group">
                  <label className="form-label required">الاسم الكامل</label>
                  <input className="form-control" required value={empForm.full_name} onChange={e => setEmpForm({...empForm, full_name: e.target.value})} placeholder="أحمد سعيد الغامدي" />
                </div>
                <div className="form-group">
                  <label className="form-label">الاسم بالإنجليزية</label>
                  <input className="form-control" value={empForm.full_name_en} onChange={e => setEmpForm({...empForm, full_name_en: e.target.value})} placeholder="Ahmed Said" />
                </div>
                <div className="form-group">
                  <label className="form-label">الجنسية</label>
                  <input className="form-control" value={empForm.nationality} onChange={e => setEmpForm({...empForm, nationality: e.target.value})} placeholder="سعودي / مقيم" />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهوية / الإقامة</label>
                  <input className="form-control" value={empForm.iqama_number} onChange={e => setEmpForm({...empForm, iqama_number: e.target.value})} placeholder="10xxxxxxxx" />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ انتهاء الإقامة</label>
                  <input className="form-control" type="date" value={empForm.iqama_expiry} onChange={e => setEmpForm({...empForm, iqama_expiry: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label required">المسمى الوظيفي</label>
                  <input className="form-control" required value={empForm.job_title} onChange={e => setEmpForm({...empForm, job_title: e.target.value})} placeholder="فني تركيبات / مهندس موقع" />
                </div>
                <div className="form-group">
                  <label className="form-label">نوع التوظيف</label>
                  <select className="form-control" value={empForm.employment_type} onChange={e => setEmpForm({...empForm, employment_type: e.target.value})}>
                    <option value="full_time">دوام كامل</option>
                    <option value="part_time">دوام جزئي</option>
                    <option value="contract">عقد مؤقت</option>
                    <option value="daily">يومية</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">الراتب الأساسي</label>
                  <input className="form-control" type="number" required value={empForm.base_salary} onChange={e => setEmpForm({...empForm, base_salary: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">بدل السكن</label>
                  <input className="form-control" type="number" value={empForm.housing_allowance} onChange={e => setEmpForm({...empForm, housing_allowance: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">بدل النقل</label>
                  <input className="form-control" type="number" value={empForm.transport_allowance} onChange={e => setEmpForm({...empForm, transport_allowance: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input className="form-control" value={empForm.phone} onChange={e => setEmpForm({...empForm, phone: e.target.value})} placeholder="05xxxxxxxx" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowEmpModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ الموظف</button>
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
              <div className="modal-title">🔨 إضافة عهدة جديدة</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAssetModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateAsset}>
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label required">كود العهدة</label>
                  <input className="form-control" required value={assetForm.asset_code} onChange={e => setAssetForm({...assetForm, asset_code: e.target.value})} placeholder="AST-100" />
                </div>
                <div className="form-group">
                  <label className="form-label required">اسم العهدة / المعدة</label>
                  <input className="form-control" required value={assetForm.asset_name} onChange={e => setAssetForm({...assetForm, asset_name: e.target.value})} placeholder="شنيور هيلتي / لابتوب لينوفو" />
                </div>
                <div className="form-group">
                  <label className="form-label">نوع العهدة</label>
                  <select className="form-control" value={assetForm.asset_type} onChange={e => setAssetForm({...assetForm, asset_type: e.target.value})}>
                    <option value="tool">عدة يدوية/كهربائية</option>
                    <option value="vehicle">سيارة/معدة كبيرة</option>
                    <option value="laptop">جهاز كمبيوتر</option>
                    <option value="phone">هاتف محمول</option>
                    <option value="equipment">جهاز اختبار حريق</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">الماركة (Brand)</label>
                  <input className="form-control" value={assetForm.brand} onChange={e => setAssetForm({...assetForm, brand: e.target.value})} placeholder="Bosch / Makita" />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">حالة المعدة</label>
                  <select className="form-control" value={assetForm.condition} onChange={e => setAssetForm({...assetForm, condition: e.target.value})}>
                    <option value="new">جديدة</option>
                    <option value="good">ممتازة</option>
                    <option value="fair">مستعملة بحالة جيدة</option>
                    <option value="poor">تحتاج صيانة</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAssetModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ العهدة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
