'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

type TabType = 'laborers' | 'daily_attendance';

interface Laborer {
  id: string; name: string; nationality: string; skill: string;
  id_number: string; phone: string; daily_rate: string; is_active: boolean;
  project_id?: string; project_name?: string;
}

interface LaborAttendance {
  id: string; worker_name: string; skill: string; project_name: string;
  attendance_date: string; is_present: boolean; hours_worked: string;
  overtime_hours: string; total_pay: string;
}

const skillLabels: Record<string, string> = {
  welder: 'لحام أنابيب حريق', installer: 'فني تركيبات شبكات',
  helper: 'مساعد فني', driver: 'سائق معدات', supervisor: 'مشرف عمال',
  technician: 'فني اختبار شبكات', other: 'مهنة أخرى'
};

export default function LaborPage() {
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrencySymbol(localStorage.getItem('system_currency_symbol') || 'ج.م');
    }
  }, []);
  const [activeTab, setActiveTab] = useState<TabType>('laborers');
  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [attendance, setAttendance] = useState<LaborAttendance[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showLaborerModal, setShowLaborerModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  // Filters
  const [projectFilter, setProjectFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Forms
  const [laborerForm, setLaborerForm] = useState({
    name: '', nationality: 'مقيم', skill: 'installer', id_number: '',
    phone: '', daily_rate: '150', notes: '', project_id: ''
  });

  const [attForm, setAttForm] = useState({
    worker_id: '', project_id: '', attendance_date: new Date().toISOString().split('T')[0],
    is_present: true, hours_worked: '8', overtime_hours: '0', daily_rate: '150', overtime_rate: '25', notes: ''
  });

  const fetchLaborers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees?employment_type=daily');
      const data = await res.json();
      // API returns {data: [...], pagination: {}} - handle both formats
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setLaborers(list.map((e: any) => ({
        id: e.id,
        name: e.full_name,
        nationality: e.nationality,
        skill: e.job_title,
        id_number: e.id_number,
        phone: e.phone,
        daily_rate: e.base_salary,
        is_active: e.status === 'active',
        project_id: e.project_id,
        project_name: e.project_name
      })));
    } finally { setLoading(false); }
  }, []);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (projectFilter) params.set('project_id', projectFilter);
    if (dateFilter) params.set('date_from', dateFilter);
    try {
      const res = await fetch(`/api/hr/attendance?${params}`);
      const data = await res.json();
      // API returns {data: [...], pagination: {}} - handle both formats
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setAttendance(list.map((a: { id: string; employee_name: string; job_title: string; project_name: string; attendance_date: string; attendance_type: string; overtime_hours: number; base_salary: string }) => ({
        id: a.id,
        worker_name: a.employee_name,
        skill: a.job_title,
        project_name: a.project_name,
        attendance_date: a.attendance_date,
        is_present: a.attendance_type === 'present',
        hours_worked: '8',
        overtime_hours: String(a.overtime_hours ?? 0),
        total_pay: String(Number(a.base_salary || 150) + (Number(a.overtime_hours || 0) * 25))
      })));
    } finally { setLoading(false); }
  }, [projectFilter, dateFilter]);

  const fetchProjectsList = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  };

  useEffect(() => {
    fetchProjectsList();
  }, []);

  useEffect(() => {
    if (activeTab === 'laborers') fetchLaborers();
    if (activeTab === 'daily_attendance') fetchAttendance();
  }, [activeTab, fetchLaborers, fetchAttendance]);

  const handleCreateLaborer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_number: 'LAB-' + Math.floor(Math.random() * 10000),
          full_name: laborerForm.name,
          nationality: laborerForm.nationality,
          job_title: laborerForm.skill,
          id_number: laborerForm.id_number,
          phone: laborerForm.phone,
          base_salary: Number(laborerForm.daily_rate),
          project_id: laborerForm.project_id || null,
          employment_type: 'daily',
          status: 'active'
        })
      });
      if (res.ok) {
        setShowLaborerModal(false);
        setLaborerForm({ name: '', nationality: 'مقيم', skill: 'installer', id_number: '', phone: '', daily_rate: '150', notes: '', project_id: '' });
        fetchLaborers();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء إضافة العامل: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleCreateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: attForm.worker_id,
          project_id: attForm.project_id || null,
          attendance_date: attForm.attendance_date,
          status: attForm.is_present ? 'present' : 'absent',
          hours_worked: attForm.is_present ? Number(attForm.hours_worked) || 8 : 0,
          overtime_hours: Number(attForm.overtime_hours) || 0,
          check_in: attForm.is_present ? `${attForm.attendance_date} 08:00:00` : null,
          check_out: attForm.is_present ? `${attForm.attendance_date} 17:00:00` : null,
          notes: attForm.notes || ''
        })
      });
      if (res.ok) {
        setShowAttendanceModal(false);
        setAttForm({
          worker_id: '', project_id: '', daily_rate: '150', attendance_date: new Date().toISOString().split('T')[0],
          is_present: true, hours_worked: '8', overtime_hours: '0', overtime_rate: '25', notes: ''
        });
        fetchAttendance();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء تسجيل حضور اليومية: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const totalDailyLaborCost = attendance.reduce((acc, a) => acc + Number(a.total_pay || 0), 0);

  return (
    <AppLayout title="العمالة اليومية واليوميات" subtitle="تسجيل حضور عمال اليومية واللحامين والتركيبات وصرف مستحقاتهم الأسبوعية واليومية" icon="👷">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'laborers' ? 'active' : ''}`} onClick={() => setActiveTab('laborers')}>👷 سجل عمال اليومية</button>
        <button className={`tab-btn ${activeTab === 'daily_attendance' ? 'active' : ''}`} onClick={() => setActiveTab('daily_attendance')}>📅 دفتر حضور اليوميات</button>
      </div>

      {/* ======================== TAB: LABORERS ======================== */}
      {activeTab === 'laborers' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">👷 سجل العمال والفنيين المستقلين</div>
              <div className="page-description">إدارة بيانات اللحامين والمساعدين وعمال التركيبات المحتسبين باليومية</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowLaborerModal(true)}>+ تسجيل عامل يومية جديد</button>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : laborers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👷</div>
                <div className="empty-state-title">لا يوجد عمال يومية مسجلين بعد</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الاسم الكامل</th>
                      <th>الجنسية</th>
                      <th>المهارة / التخصص</th>
                      <th>رقم الإقامة / الهوية</th>
                      <th>الموقع الملتزم به</th>
                      <th>جوال الاتصال</th>
                      <th>الأجر اليومي المعتاد</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laborers.map(l => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.name}</td>
                        <td>{l.nationality}</td>
                        <td><span className="badge badge-primary">{skillLabels[l.skill] || l.skill}</span></td>
                        <td>{l.id_number || '-'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--brand-primary-light)' }}>{l.project_name || 'بالمكتب الرئيسي'}</td>
                        <td style={{ direction: 'ltr', textAlign: 'right' }}>{l.phone || '-'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--status-success)' }}>{formatCurrency(l.daily_rate)}</td>
                        <td>
                          <span className={`badge ${l.is_active ? 'badge-success' : 'badge-muted'}`}>
                            {l.is_active ? 'نشط' : 'غير نشط'}
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

      {/* ======================== TAB: DAILY ATTENDANCE ======================== */}
      {activeTab === 'daily_attendance' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📅 دفتر حضور وتسجيل يوميات المواقع</div>
              <div className="page-description">رصد يوميات العمال وحساب المبالغ المستحقة يومياً بناءً على ساعات العمل والإضافي</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowAttendanceModal(true)}>+ تسجيل يومية عامل 📅</button>
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card success">
              <div className="stat-card-icon">💵</div>
              <div className="stat-value">{formatCurrency(totalDailyLaborCost)}</div>
              <div className="stat-label">إجمالي أجور العمال اليوم المحددة</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon">👷</div>
              <div className="stat-value">{attendance.length}</div>
              <div className="stat-label">عمال مسجل حضورهم اليوم</div>
            </div>
          </div>

          <div className="filter-bar">
            <input className="form-control" type="date" style={{ width: 'auto' }} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            <select className="form-control" style={{ width: 'auto' }} value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
              <option value="">كل المشاريع / المواقع</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : attendance.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <div className="empty-state-title">لا توجد سجلات يوميات لهذا اليوم بالموقع المحدد</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>اسم العامل</th>
                      <th>التخصص</th>
                      <th>الموقع / المشروع</th>
                      <th>التاريخ</th>
                      <th>حالة الحضور</th>
                      <th>ساعات الإضافي</th>
                      <th>الأجر الإجمالي المستحق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.worker_name}</td>
                        <td>{skillLabels[a.skill] || a.skill}</td>
                        <td style={{ fontWeight: 600 }}>{a.project_name || 'بالمكتب الرئيسي'}</td>
                        <td>{new Date(a.attendance_date).toLocaleDateString('ar-SA')}</td>
                        <td>
                          <span className={`badge ${a.is_present ? 'badge-success' : 'badge-danger'}`}>
                            {a.is_present ? 'حاضر' : 'غائب'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--status-purple)', fontWeight: 600 }}>{a.overtime_hours} ساعة</td>
                        <td style={{ fontWeight: 700, color: 'var(--status-success)' }}>{formatCurrency(a.total_pay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== MODAL: ADD LABORER ======================== */}
      {showLaborerModal && (
        <div className="modal-overlay" onClick={() => setShowLaborerModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">👷 تسجيل عامل يومية جديد</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowLaborerModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateLaborer}>
              <div className="form-grid form-grid-3">
                <div className="form-group col-span-3">
                  <label className="form-label required">الاسم الكامل</label>
                  <input className="form-control" required value={laborerForm.name} onChange={e => setLaborerForm({...laborerForm, name: e.target.value})} placeholder="محمد إقبال شاه..." />
                </div>
                <div className="form-group">
                  <label className="form-label required">الجنسية</label>
                  <input className="form-control" required value={laborerForm.nationality} onChange={e => setLaborerForm({...laborerForm, nationality: e.target.value})} placeholder="باكستاني / هندي..." />
                </div>
                <div className="form-group">
                  <label className="form-label">المهارة / التخصص</label>
                  <select className="form-control" value={laborerForm.skill} onChange={e => setLaborerForm({...laborerForm, skill: e.target.value})}>
                    {Object.entries(skillLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الإقامة / الهوية</label>
                  <input className="form-control" value={laborerForm.id_number} onChange={e => setLaborerForm({...laborerForm, id_number: e.target.value})} placeholder="24xxxxxxxx" />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم جوال الاتصال</label>
                  <input className="form-control" value={laborerForm.phone} onChange={e => setLaborerForm({...laborerForm, phone: e.target.value})} placeholder="05xxxxxxxx" />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label required">أجر اليومية المتفق عليه ({currencySymbol})</label>
                  <input className="form-control" type="number" required value={laborerForm.daily_rate} onChange={e => setLaborerForm({...laborerForm, daily_rate: e.target.value})} placeholder="150" />
                </div>
                <div className="form-group col-span-3">
                  <label className="form-label">الموقع / المشروع الملتزم به افتراضياً</label>
                  <select className="form-control" value={laborerForm.project_id} onChange={e => setLaborerForm({...laborerForm, project_id: e.target.value})}>
                    <option value="">بالمكتب الرئيسي (غير مرتبط بمشروع)</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowLaborerModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 تسجيل العامل</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD DAILY ATTENDANCE ======================== */}
      {showAttendanceModal && (
        <div className="modal-overlay" onClick={() => setShowAttendanceModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📅 تسجيل يومية حضور عمال</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAttendanceModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateAttendance}>
              <div className="form-grid form-grid-3">
                <div className="form-group col-span-3">
                  <label className="form-label required">العامل</label>
                  <select className="form-control" required value={attForm.worker_id} onChange={e => {
                    const worker = laborers.find(l => l.id === e.target.value);
                    setAttForm({
                      ...attForm, 
                      worker_id: e.target.value, 
                      daily_rate: worker ? worker.daily_rate : '150',
                      project_id: worker?.project_id || ''
                    });
                  }}>
                    <option value="">اختر العامل...</option>
                    {laborers.map(l => <option key={l.id} value={l.id}>{l.name} ({skillLabels[l.skill] || l.skill})</option>)}
                  </select>
                </div>
                <div className="form-group col-span-3">
                  <label className="form-label required">الموقع / المشروع المستضيف</label>
                  <select className="form-control" required value={attForm.project_id} onChange={e => setAttForm({...attForm, project_id: e.target.value})}>
                    <option value="">اختر المشروع...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">تاريخ اليومية</label>
                  <input className="form-control" type="date" required value={attForm.attendance_date} onChange={e => setAttForm({...attForm, attendance_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">عدد الساعات الإضافية</label>
                  <input className="form-control" type="number" value={attForm.overtime_hours} onChange={e => setAttForm({...attForm, overtime_hours: e.target.value})} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label required">الأجر اليومي ({currencySymbol})</label>
                  <input className="form-control" type="number" required value={attForm.daily_rate} onChange={e => setAttForm({...attForm, daily_rate: e.target.value})} />
                </div>
                <div className="form-group col-span-3">
                  <label className="form-label">أجر الساعة الإضافية ({currencySymbol})</label>
                  <input className="form-control" type="number" value={attForm.overtime_rate} onChange={e => setAttForm({...attForm, overtime_rate: e.target.value})} placeholder="25" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAttendanceModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ اليومية</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
