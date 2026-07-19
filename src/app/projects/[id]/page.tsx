'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

interface PageParams {
  id: string;
}

interface ProjectDetailPageProps {
  params: Promise<PageParams>;
}

interface ProjectDetails {
  project: {
    id: string;
    name: string;
    code: string;
    client_name: string;
    client_contact: string;
    location: string;
    start_date: string;
    end_date: string;
    contract_value: string;
    status: string;
    description: string;
    manager_name: string;
    engineer_name: string;
  };
  phases: Array<{
    id: string;
    phase_name: string;
    phase_type: string;
    description: string;
    planned_start: string;
    planned_end: string;
    actual_start: string;
    actual_end: string;
    planned_progress: string;
    actual_progress: string;
    weight_percentage?: string | number;
  }>;
  progress: Array<{
    id: string;
    report_date: string;
    planned_percentage: string;
    actual_percentage: string;
    notes: string;
  }>;
  expenses: Array<{
    category: string;
    total: string;
  }>;
  ipcs: Array<{
    id: string;
    ipc_number: string;
    ipc_date: string;
    net_payable: string;
    status: string;
  }>;
  subIpcs: Array<{
    id: string;
    ipc_number: string;
    ipc_date: string;
    net_payable: string;
    status: string;
    subcontractor_name: string;
    scope_of_work: string;
  }>;
  debts: Array<{
    id: string;
    creditor_name: string;
    debt_type: string;
    amount: string;
    due_date: string;
    paid_amount: string;
    status: string;
    notes: string;
  }>;
  documents: Array<{
    id: string;
    document_name: string;
    file_url: string;
    uploaded_at: string;
  }>;
  laborAttendance: Array<{
    id: string;
    employee_id: string;
    employee_name: string;
    attendance_date: string;
    attendance_type: string;
    hours_worked: number;
    overtime_hours: number;
    base_salary: string;
    notes?: string;
  }>;
}

type TabType = 'overview' | 'phases' | 'progress' | 'financials' | 'documents' | 'reports';

const statusLabels: Record<string, string> = {
  active: 'نشط', completed: 'مكتمل', suspended: 'متوقف', tender: 'مناقصة'
};
const statusBadge: Record<string, string> = {
  active: 'badge-success', completed: 'badge-primary', suspended: 'badge-warning', tender: 'badge-purple'
};

const ipcStatusLabels: Record<string, string> = {
  draft: 'مسودة', pending_payment: 'معلق الصرف', paid: 'تم الصرف', client_approved: 'معتمد من الاستشاري'
};
const ipcStatusBadge: Record<string, string> = {
  draft: 'badge-muted', pending_payment: 'badge-warning', paid: 'badge-success', client_approved: 'badge-info'
};

const phaseTypeLabels: Record<string, string> = {
  networks: 'شبكات حريق', risers: 'صواعد وهوابط', fixtures: 'تركيبات نهائية', testing: 'اختبارات وضغط', commissioning: 'تشغيل وتسليم', other: 'أعمال أخرى'
};

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;

  const [details, setDetails] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [uploading, setUploading] = useState(false);

  // Print modal states
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [showPrintProgressModal, setShowPrintProgressModal] = useState(false);
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setCompanyInfo(data))
      .catch(err => console.error(err));
  }, []);

  // Phase editing states
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState<any | null>(null);
  const [savingPhase, setSavingPhase] = useState(false);
  const [phaseForm, setPhaseForm] = useState({
    phase_name: '',
    phase_type: 'networks',
    description: '',
    planned_start: '',
    planned_end: '',
    actual_start: '',
    actual_end: '',
    planned_progress: '0',
    actual_progress: '0',
    weight_percentage: '10'
  });

  const handleOpenCreatePhase = () => {
    setEditingPhase(null);
    setPhaseForm({
      phase_name: '',
      phase_type: 'networks',
      description: '',
      planned_start: '',
      planned_end: '',
      actual_start: '',
      actual_end: '',
      planned_progress: '0',
      actual_progress: '0',
      weight_percentage: '10'
    });
    setShowPhaseModal(true);
  };

  const handleOpenEditPhase = (phase: any) => {
    setEditingPhase(phase);
    setPhaseForm({
      phase_name: phase.phase_name || '',
      phase_type: phase.phase_type || 'networks',
      description: phase.description || '',
      planned_start: phase.planned_start ? phase.planned_start.split('T')[0] : '',
      planned_end: phase.planned_end ? phase.planned_end.split('T')[0] : '',
      actual_start: phase.actual_start ? phase.actual_start.split('T')[0] : '',
      actual_end: phase.actual_end ? phase.actual_end.split('T')[0] : '',
      planned_progress: String(phase.planned_progress ?? '0'),
      actual_progress: String(phase.actual_progress ?? '0'),
      weight_percentage: String(phase.weight_percentage ?? '10')
    });
    setShowPhaseModal(true);
  };

  const handleSavePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPhase(true);
    try {
      const url = '/api/projects/phases';
      const method = editingPhase ? 'PUT' : 'POST';
      const body = {
        ...phaseForm,
        id: editingPhase?.id,
        project_id: id,
        planned_progress: Number(phaseForm.planned_progress) || 0,
        actual_progress: Number(phaseForm.actual_progress) || 0,
        weight_percentage: Number(phaseForm.weight_percentage) || 0
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowPhaseModal(false);
        fetchDetails();
      } else {
        const err = await res.json();
        alert(`❌ فشل حفظ المرحلة: ${err.error || 'خطأ غير معروف'}`);
      }
    } catch (err: any) {
      alert(`❌ خطأ في الاتصال بالخادم: ${err.message}`);
    } finally {
      setSavingPhase(false);
    }
  };

  const handleDeletePhase = async (phaseId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذه المرحلة نهائياً؟')) return;
    try {
      const res = await fetch(`/api/projects/phases?id=${phaseId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDetails();
      } else {
        alert('❌ فشل حذف المرحلة.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('فشل تحميل تفاصيل المشروع من السيرفر');
      const data = await res.json();
      setDetails(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return (
      <AppLayout title="جاري التحميل..." icon="🏗️">
        <div className="empty-state">
          <div className="loading-spinner" />
          <div style={{ marginTop: '1rem' }}>جاري تحميل الملف الفني للمشروع...</div>
        </div>
      </AppLayout>
    );
  }

  if (error || !details) {
    return (
      <AppLayout title="خطأ" icon="⚠️">
        <div className="card text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ fontSize: '1.2rem', color: 'var(--status-danger)', marginBottom: '1.5rem' }}>
            {error || 'عذراً، لم يتم العثور على تفاصيل للمشروع المحدد.'}
          </div>
          <button onClick={() => router.push('/projects')} className="btn btn-primary">
            العودة للمشاريع
          </button>
        </div>
      </AppLayout>
    );
  }

  const { project, phases, progress, expenses, ipcs, subIpcs, debts = [], documents = [], laborAttendance = [] } = details;
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.total || 0), 0);
  
  // Calculate dynamic average/weighted progress
  const totalWeight = phases.reduce((acc, p) => acc + Number(p.weight_percentage || 0), 0);
  const actualProgress = totalWeight > 0 
    ? (phases.reduce((acc, p) => acc + (Number(p.actual_progress || 0) * Number(p.weight_percentage || 0)), 0) / totalWeight)
    : (phases.length > 0 ? (phases.reduce((acc, p) => acc + Number(p.actual_progress || 0), 0) / phases.length) : 0);

  const plannedProgress = totalWeight > 0 
    ? (phases.reduce((acc, p) => acc + (Number(p.planned_progress || 0) * Number(p.weight_percentage || 0)), 0) / totalWeight)
    : (phases.length > 0 ? (phases.reduce((acc, p) => acc + Number(p.planned_progress || 0), 0) / phases.length) : 0);

  // Financial calculations
  const earnedValue = Number(project.contract_value || 0) * (actualProgress / 100);
  const totalInvoiced = ipcs.filter(i => i.status === 'paid' || i.status === 'client_approved' || i.status === 'pending_payment').reduce((acc, i) => acc + Number(i.net_payable || 0), 0);
  const totalCollected = ipcs.filter(i => i.status === 'paid').reduce((acc, i) => acc + Number(i.net_payable || 0), 0);
  const totalSubcontractorIpc = subIpcs.filter(s => s.status === 'paid' || s.status === 'approved' || s.status === 'submitted').reduce((acc, s) => acc + Number(s.net_payable || 0), 0);
  const totalDailyLaborCost = laborAttendance.reduce((acc, a) => {
    const rate = Number(a.base_salary || 150);
    const overtime = Number(a.overtime_hours || 0) * 25;
    return acc + (a.attendance_type === 'present' ? (rate + overtime) : 0);
  }, 0);
  const netProjectProfit = totalInvoiced - (totalExpenses + totalSubcontractorIpc + totalDailyLaborCost);

  return (
    <AppLayout title={project.name} subtitle={`ملف المشروع الكود: ${project.code}`} icon="🏗️">
      
      {/* Dynamic Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>🏗️</span> 
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span>{project.name}</span>
                <span className={`badge ${statusBadge[project.status] || 'badge-muted'}`}>
                  {statusLabels[project.status] || project.status}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '2px' }}>
                رمز الكود المرجعي: {project.code}
              </div>
            </div>
          </div>
        </div>
        <div className="page-header-actions">
          <button onClick={() => router.push('/projects')} className="btn btn-outline">
            ← العودة لقائمة المشاريع
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 نظرة عامة</button>
        <button className={`tab-btn ${activeTab === 'phases' ? 'active' : ''}`} onClick={() => setActiveTab('phases')}>📈 مراحل العمل ({phases.length})</button>
        <button className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`} onClick={() => setActiveTab('progress')}>📋 تقارير الإنجاز</button>
        <button className={`tab-btn ${activeTab === 'financials' ? 'active' : ''}`} onClick={() => setActiveTab('financials')}>💰 الحسابات والمصروفات</button>
        <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>📁 المرفقات والمخططات ({documents.length})</button>
        <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>📊 تقارير الأرباح والإنجاز</button>
      </div>

      {/* ======================== TAB: OVERVIEW ======================== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Row */}
          <div className="stat-grid">
            <div className="stat-card accent">
              <div className="stat-card-icon">💰</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(project.contract_value)}</div>
              <div className="stat-label">القيمة التعاقدية للمشروع</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-card-icon">📈</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{actualProgress.toFixed(1)}%</div>
              <div className="stat-label">نسبة الإنجاز الإجمالية (الفنية)</div>
            </div>
            <div className="stat-card success">
              <div className="stat-card-icon">💼</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(earnedValue)}</div>
              <div className="stat-label">قيمة الأعمال المنجزة (Earned Value)</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-card-icon">📊</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(totalExpenses + totalSubcontractorIpc + totalDailyLaborCost)}</div>
              <div className="stat-label">إجمالي التكاليف (مصاريف + مقاولين + عمال)</div>
            </div>
          </div>

          {/* Core Info Details Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📝 بطاقة تعريف المشروع والموقع</div>
              <div className="card-subtitle">البيانات الأساسية وتفاصيل الاتصال الخاصة بالمشروع</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>اسم العميل</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{project.client_name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>وسيلة الاتصال بالعميل</span>
                <span style={{ color: 'var(--text-secondary)' }}>{project.client_contact || '-'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>الموقع الجغرافي</span>
                <span style={{ color: 'var(--text-secondary)' }}>📍 {project.location || '-'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>تاريخ البدء</span>
                <span style={{ color: 'var(--text-secondary)' }}>{project.start_date ? new Date(project.start_date).toLocaleDateString('ar-EG') : '-'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>تاريخ التسليم المتوقع</span>
                <span style={{ color: 'var(--text-secondary)' }}>{project.end_date ? new Date(project.end_date).toLocaleDateString('ar-EG') : '-'}</span>
              </div>
            </div>
            
            {project.description && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>الوصف ونطاق العمل</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{project.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================== TAB: PHASES ======================== */}
      {activeTab === 'phases' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">📈 مراحل تنفيذ الأعمال وجدول التقدم الفني</div>
              <div className="card-subtitle">تتبع نسب إنجاز أعمال الشبكات والتركيبات وتفاصيل تواريخ التنفيذ والوزن المالي لكل مرحلة</div>
            </div>
            <button className="btn btn-primary" onClick={handleOpenCreatePhase}>
              ➕ إضافة مرحلة عمل جديدة
            </button>
          </div>
          {phases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📈</div>
              <div className="empty-state-title">لا توجد مراحل عمل مسجلة لهذا المشروع</div>
              <button className="btn btn-primary" onClick={handleOpenCreatePhase} style={{ marginTop: '1rem' }}>إضافة أول مرحلة عمل</button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المرحلة</th>
                    <th>نوع الأعمال</th>
                    <th>مخطط البدء/الانتهاء</th>
                    <th>الوزن النسبي/المالي</th>
                    <th>النسبة المخططة</th>
                    <th>النسبة الفعلية الحالية</th>
                    <th>الحالة والتقدم</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>العمليات</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map(phase => {
                    const actualProgressNum = Number(phase.actual_progress || 0);
                    return (
                      <tr key={phase.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{phase.phase_name}</td>
                        <td>
                          <span className="badge badge-muted">
                            {phaseTypeLabels[phase.phase_type] || phase.phase_type}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          <div>من: {phase.planned_start ? new Date(phase.planned_start).toLocaleDateString('ar-EG') : '-'}</div>
                          <div>إلى: {phase.planned_end ? new Date(phase.planned_end).toLocaleDateString('ar-EG') : '-'}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--brand-primary-light)' }}>
                          {Number(phase.weight_percentage || 0).toFixed(0)}%
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{Number(phase.planned_progress).toFixed(0)}%</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--status-success)' }}>
                          {actualProgressNum.toFixed(0)}%
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="progress-bar" style={{ width: '80px', height: '6px' }}>
                              <div 
                                className={`progress-fill ${actualProgressNum >= 80 ? 'success' : actualProgressNum >= 40 ? 'warning' : 'danger'}`}
                                style={{ width: `${Math.min(actualProgressNum, 100)}%` }}
                              />
                            </div>
                            <span style={{ fontSize: '0.72rem' }}>
                              {actualProgressNum >= 100 ? 'مكتملة' : 'جاري العمل'}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => handleOpenEditPhase(phase)} title="تعديل المرحلة">✏️</button>
                            <button className="btn btn-outline btn-sm text-danger" onClick={() => handleDeletePhase(phase.id)} title="حذف المرحلة">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================== TAB: PROGRESS ======================== */}
      {activeTab === 'progress' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="card-title">📋 سجل تقارير نسب الإنجاز الأسبوعية</div>
              <div className="card-subtitle">التقارير المرفوعة دورياً من المشرفين والمهندسين بالموقع</div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowPrintProgressModal(true)}>
              🖨️ طباعة تقرير الإنجاز والتنفيذ
            </button>
          </div>
          {progress.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">لا توجد تقارير إنجاز مرفوعة لهذا المشروع</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>تاريخ التقرير</th>
                    <th style={{ textAlign: 'center' }}>النسبة المخططة في التقرير</th>
                    <th style={{ textAlign: 'center' }}>النسبة الفعلية المحققة</th>
                    <th>ملاحظات المهندس المشرف</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map(prog => (
                    <tr key={prog.id}>
                      <td style={{ fontWeight: 600 }}>
                        {prog.report_date ? new Date(prog.report_date).toLocaleDateString('ar-EG') : '-'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{Number(prog.planned_percentage).toFixed(1)}%</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--brand-primary-light)' }}>
                        {Number(prog.actual_percentage).toFixed(1)}%
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{prog.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================== TAB: FINANCIALS ======================== */}
      {activeTab === 'financials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Client IPCs */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">💵 مستخلصات المالك (Client Invoices)</div>
              <div className="card-subtitle">المستخلصات والمطالبات المالية المرفوعة لمالك المشروع أو الاستشاري</div>
            </div>
            {ipcs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💵</div>
                <div className="empty-state-title">لا توجد مستخلصات مالك مسجلة بعد</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم المستخلص</th>
                      <th>تاريخ المستخلص</th>
                      <th>المبلغ الصافي المطلوب</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipcs.map(ipc => (
                      <tr key={ipc.id}>
                        <td style={{ fontWeight: 700 }}>{ipc.ipc_number}</td>
                        <td>{ipc.ipc_date ? new Date(ipc.ipc_date).toLocaleDateString('ar-EG') : '-'}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--status-success)' }}>{formatCurrency(ipc.net_payable)}</td>
                        <td>
                          <span className={`badge ${ipcStatusBadge[ipc.status] || 'badge-muted'}`}>
                            {ipcStatusLabels[ipc.status] || ipc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Subcontractor IPCs */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🤝 مستخلصات مقاولي الباطن بالموقع</div>
              <div className="card-subtitle">مطالبات الصرف المعتمدة لمقاولي الباطن والفرق المسؤولة عن شبكات وصواعد الموقع</div>
            </div>
            {subIpcs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🤝</div>
                <div className="empty-state-title">لا توجد مستخلصات لمقاولي الباطن مسجلة</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>مقاول الباطن</th>
                      <th>رقم مستخلص الباطن</th>
                      <th>نطاق عمل المقاول</th>
                      <th>تاريخ المطالبة</th>
                      <th>المبلغ المعتمد</th>
                      <th>حالة المستخلص</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subIpcs.map(sub => (
                      <tr key={sub.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sub.subcontractor_name}</td>
                        <td style={{ fontWeight: 700 }}>{sub.ipc_number}</td>
                        <td style={{ fontSize: '0.8rem' }}>{sub.scope_of_work || '-'}</td>
                        <td>{sub.ipc_date ? new Date(sub.ipc_date).toLocaleDateString('ar-EG') : '-'}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--status-danger)' }}>{formatCurrency(sub.net_payable)}</td>
                        <td>
                          <span className={`badge ${ipcStatusBadge[sub.status] || 'badge-muted'}`}>
                            {ipcStatusLabels[sub.status] || sub.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expenses Chart categories list */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🔧 فئات المصروفات النثرية المنصرفة للموقع</div>
              <div className="card-subtitle">تفاصيل المبالغ الموزعة حسب بنود الصرف كالمواد، النقل، والعمالة</div>
            </div>
            {expenses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔧</div>
                <div className="empty-state-title">لم تسجل أي مصروفات نثرية لهذا الموقع بعد</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>تصنيف بند المصروفات</th>
                      <th>إجمالي المبلغ المنصرف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{exp.category}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--status-danger)' }}>{formatCurrency(exp.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Project Debts and Financing */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📈 التمويل والمديونيات الخارجية للمشروع</div>
              <div className="card-subtitle">سجل القروض التمويلية المؤقتة والالتزامات المالية الخاصة بهذا المشروع</div>
            </div>
            {debts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏛️</div>
                <div className="empty-state-title">لا توجد قروض تمويلية أو مديونيات مسجلة لهذا المشروع</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الدائن / المقرض</th>
                      <th>نوع الالتزام</th>
                      <th>القيمة الإجمالية</th>
                      <th>تاريخ الاستحقاق</th>
                      <th>المسدد نقداً</th>
                      <th>المتبقي</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts.map(debt => {
                      const remaining = Number(debt.amount) - Number(debt.paid_amount);
                      return (
                        <tr key={debt.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{debt.creditor_name}</td>
                          <td>
                            <span className="badge badge-purple">
                              {debt.debt_type === 'project_finance' ? '💵 تمويل مشروع' : debt.debt_type === 'subcontractor_ipc' ? '🔗 مستخلص باطن' : debt.debt_type === 'supplier_invoice' ? '🧾 فاتورة توريد' : 'أخرى'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(debt.amount)}</td>
                          <td>{debt.due_date ? new Date(debt.due_date).toLocaleDateString('ar-SA') : '-'}</td>
                          <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{formatCurrency(debt.paid_amount)}</td>
                          <td style={{ color: 'var(--status-danger)', fontWeight: 600 }}>{formatCurrency(remaining)}</td>
                          <td>
                            <span className={`badge ${debt.status === 'paid' ? 'badge-success' : debt.status === 'partially_paid' ? 'badge-warning' : 'badge-danger'}`}>
                              {debt.status === 'paid' ? 'مسدد بالكامل' : debt.status === 'partially_paid' ? 'مسدد جزئياً' : 'غير مسدد'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================== TAB: DOCUMENTS ======================== */}
      {activeTab === 'documents' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">📁 مستندات ومخططات المشروع</div>
              <div className="card-subtitle">الملفات والعقود الهندسية والمخططات المرفوعة للمشروع على Cloudflare R2</div>
            </div>
            <div>
              <input 
                type="file" 
                multiple 
                accept="image/*,.pdf,.xls,.xlsx" 
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  setUploading(true);
                  try {
                    for (let i = 0; i < files.length; i++) {
                      const file = files[i];
                      const formData = new FormData();
                      formData.append('file', file);

                      const uploadRes = await fetch('/api/employees/upload', {
                        method: 'POST',
                        body: formData
                      });

                      if (uploadRes.ok) {
                        const uploadData = await uploadRes.json();
                        // Save document to DB
                        const saveRes = await fetch('/api/projects/documents', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            project_id: id,
                            document_name: file.name,
                            file_url: uploadData.key
                          })
                        });

                        if (saveRes.ok) {
                          fetchDetails();
                        } else {
                          alert('فشل حفظ معلومات الملف في قاعدة البيانات.');
                        }
                      } else {
                        alert(`فشل رفع الملف ${file.name}`);
                      }
                    }
                  } catch(err) {
                    console.error(err);
                    alert('حدث خطأ أثناء رفع الملفات.');
                  } finally {
                    setUploading(false);
                  }
                }} 
                disabled={uploading}
                style={{ display: 'none' }}
                id="project-detail-upload"
              />
              <label 
                htmlFor="project-detail-upload" 
                className="btn btn-primary" 
                style={{ cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {uploading ? (
                  <>
                    <span className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                    جاري الرفع...
                  </>
                ) : '➕ رفع ملف جديد للمشروع'}
              </label>
            </div>
          </div>

          <div className="card-body">
            {documents.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem' }}>
                <div className="empty-state-icon">📁</div>
                <div className="empty-state-title">لا توجد ملفات مرفوعة للمشروع حالياً</div>
                <div className="empty-state-description">استخدم الزر في الأعلى لرفع المخططات وعقود التنفيذ وتراخيص البناء.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                {documents.map((doc) => {
                  const url = `/api/r2-file?key=${encodeURIComponent(doc.file_url)}`;
                  const isImage = (f: string) => ['png', 'jpg', 'jpeg', 'gif'].includes(f.split('.').pop()?.toLowerCase() || '');
                  const isPdf = (f: string) => f.toLowerCase().endsWith('.pdf');
                  const isExcel = (f: string) => ['xls', 'xlsx'].includes(f.split('.').pop()?.toLowerCase() || '');

                  return (
                    <div key={doc.id} style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-normal)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '2rem' }}>
                          {isPdf(doc.file_url) ? '📕' : isExcel(doc.file_url) ? '📗' : isImage(doc.file_url) ? '🖼️' : '📎'}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {doc.document_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            تاريخ الرفع: {new Date(doc.uploaded_at).toLocaleDateString('ar-SA')}
                          </div>
                        </div>
                      </div>

                      <div style={{ 
                        height: '140px', 
                        background: 'rgba(0,0,0,0.2)', 
                        borderRadius: '8px', 
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        {isImage(doc.file_url) ? (
                          <img src={url} alt={doc.document_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : isPdf(doc.file_url) ? (
                          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '2.5rem' }}>📄</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>مستند PDF</span>
                          </div>
                        ) : isExcel(doc.file_url) ? (
                          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '2.5rem' }}>📊</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>جدول Excel</span>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '2rem' }}>📎</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>ملف مرفق</div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-outline btn-sm" 
                          style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}
                        >
                          {isImage(doc.file_url) || isPdf(doc.file_url) ? '👁️ عرض' : '📥 تحميل'}
                        </a>
                        {(isImage(doc.file_url) || isPdf(doc.file_url)) && (
                          <a 
                            href={url} 
                            download
                            className="btn btn-ghost btn-sm" 
                            style={{ border: '1px solid var(--border-subtle)', justifyContent: 'center' }}
                          >
                            📥
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================== TAB: REPORTS ======================== */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Project Net Profitability Summary Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(23,43,77,0.4) 0%, rgba(9,30,66,0.6) 100%)', border: '1px solid var(--brand-primary-light)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div className="card-title" style={{ color: 'var(--brand-primary-light)' }}>📊 التقرير المالي والأرباح التقديرية للمشروع</div>
                <div className="card-subtitle">الربحية الصافية والتدفق المالي المحتسب بناءً على الفواتير، المصاريف، مقاولي الباطن وعمال اليومية</div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowPrintReportModal(true)}>
                🖨️ طباعة تقرير الأرباح والإنجاز
              </button>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>💰 القيمة التعاقدية الكلية:</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-primary)' }}>{formatCurrency(project.contract_value)}</div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📥 إجمالي المستخلصات المعتمدة:</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--status-warning)' }}>{formatCurrency(totalInvoiced)}</div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>💵 إجمالي التحصيل المالي (العميل):</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--status-success)' }}>{formatCurrency(totalCollected)}</div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>💸 صافي ربحية المشروع الحالية:</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.25rem', color: netProjectProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                    {formatCurrency(netProjectProfit)}
                  </div>
                </div>
              </div>

              {/* Cost Breakdown Progress Indicators */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>🔍 تفصيل التكاليف والمصروفات:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,0,0,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,0,0,0.1)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>⚙️ المصروفات النثرية والمشتريات:</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--text-primary)' }}>{formatCurrency(totalExpenses)}</div>
                  </div>
                  <div style={{ background: 'rgba(255,165,0,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,165,0,0.1)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>🤝 مستخلصات مقاولي الباطن:</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--text-primary)' }}>{formatCurrency(totalSubcontractorIpc)}</div>
                  </div>
                  <div style={{ background: 'rgba(0,191,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(0,191,255,0.1)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>👷 تكاليف أجور عمال اليوميات بالموقع:</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--text-primary)' }}>{formatCurrency(totalDailyLaborCost)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase-wise Progress & Value Earned Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📈 التحليل والتقدم المالي والزمني لمراحل العمل</div>
              <div className="card-subtitle">مقارنة نسبة التقدم الهندسي الفعلي للأعمال مع الأوزان المالية لكل مرحلة من المراحل المحددة</div>
            </div>
            <div className="card-body">
              {phases.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📈</div>
                  <div className="empty-state-title">لا توجد مراحل عمل مسجلة لحساب نسب الإنجاز المالي.</div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>المرحلة</th>
                        <th>الوزن النسبي للمرحلة</th>
                        <th>قيمة المرحلة المالية من العقد</th>
                        <th>نسبة الإنجاز الفني</th>
                        <th>الأعمال المنجزة المستحقة (Earned Value)</th>
                        <th>تاريخ البدء/الانتهاء المخطط</th>
                      </tr>
                    </thead>
                    <tbody>
                      {phases.map(phase => {
                        const phaseWeightNum = Number(phase.weight_percentage || 0);
                        const phaseProgressNum = Number(phase.actual_progress || 0);
                        const phaseVal = Number(project.contract_value || 0) * (phaseWeightNum / 100);
                        const phaseEarnedVal = phaseVal * (phaseProgressNum / 100);
                        return (
                          <tr key={phase.id}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{phase.phase_name}</td>
                            <td style={{ fontWeight: 700 }}>{phaseWeightNum.toFixed(1)}%</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{formatCurrency(phaseVal)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{phaseProgressNum.toFixed(0)}%</span>
                                <div className="progress-bar" style={{ width: '60px', height: '4px' }}>
                                  <div className="progress-fill success" style={{ width: `${phaseProgressNum}%` }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--status-success)' }}>{formatCurrency(phaseEarnedVal)}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              من: {phase.planned_start ? new Date(phase.planned_start).toLocaleDateString('ar-EG') : '-'}
                              <br />
                              إلى: {phase.planned_end ? new Date(phase.planned_end).toLocaleDateString('ar-EG') : '-'}
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ fontWeight: 'bold', background: 'rgba(255,255,255,0.04)' }}>
                        <td>المجموع الكلي للمشروع</td>
                        <td>{totalWeight.toFixed(1)}%</td>
                        <td>{formatCurrency(Number(project.contract_value))}</td>
                        <td>{actualProgress.toFixed(1)}%</td>
                        <td style={{ color: 'var(--status-success)' }}>{formatCurrency(earnedValue)}</td>
                        <td>-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Daily Labor Attendance Logs for this Project */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">👷 سجل حضور وتكاليف عمال اليومية المسجلين بالموقع</div>
              <div className="card-subtitle">العمال الذين تم إدراج حضورهم لهذا المشروع وتفاصيل أجورهم المباشرة والإضافي</div>
            </div>
            <div className="card-body">
              {laborAttendance.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">👷</div>
                  <div className="empty-state-title">لم يتم تسجيل حضور أي عامل يومية في هذا الموقع بعد</div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>اسم العامل اليومية</th>
                        <th>التاريخ</th>
                        <th>حالة الحضور</th>
                        <th>ساعات العمل الإضافي</th>
                        <th>الأجر اليومي المعتاد</th>
                        <th>التكلفة المستحقة المسجلة</th>
                        <th>ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laborAttendance.map((att) => {
                        const rate = Number(att.base_salary || 150);
                        const overtime = Number(att.overtime_hours || 0) * 25;
                        const total = att.attendance_type === 'present' ? (rate + overtime) : 0;
                        return (
                          <tr key={att.id}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{att.employee_name}</td>
                            <td>{new Date(att.attendance_date).toLocaleDateString('ar-EG')}</td>
                            <td>
                              <span className={`badge ${att.attendance_type === 'present' ? 'badge-success' : 'badge-danger'}`}>
                                {att.attendance_type === 'present' ? 'حاضر' : 'غائب'}
                              </span>
                            </td>
                            <td style={{ color: 'var(--status-purple)', fontWeight: 600 }}>{att.overtime_hours} ساعة</td>
                            <td>{formatCurrency(rate)}</td>
                            <td style={{ fontWeight: 700, color: 'var(--status-success)' }}>{formatCurrency(total)}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{att.notes || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD / EDIT PROJECT PHASE ======================== */}
      {showPhaseModal && (
        <div className="modal-overlay" onClick={() => setShowPhaseModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingPhase ? '📐 تعديل مرحلة عمل المشروع' : '➕ إضافة مرحلة عمل جديدة للمشروع'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPhaseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSavePhase}>
              <div className="form-grid form-grid-3">
                <div className="form-group col-span-2">
                  <label className="form-label required">اسم المرحلة</label>
                  <input 
                    className="form-control" 
                    required 
                    value={phaseForm.phase_name} 
                    onChange={e => setPhaseForm({...phaseForm, phase_name: e.target.value})} 
                    placeholder="تركيب شبكة الإطفاء بالدور الأرضي..." 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">نوع المرحلة</label>
                  <select 
                    className="form-control" 
                    required 
                    value={phaseForm.phase_type} 
                    onChange={e => setPhaseForm({...phaseForm, phase_type: e.target.value})}
                  >
                    {Object.entries(phaseTypeLabels).map(([k,v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">الوزن النسبي/المالي (%)</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    required 
                    value={phaseForm.weight_percentage} 
                    onChange={e => setPhaseForm({...phaseForm, weight_percentage: e.target.value})} 
                    placeholder="10" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">التقدم المخطط (%)</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    required 
                    value={phaseForm.planned_progress} 
                    onChange={e => setPhaseForm({...phaseForm, planned_progress: e.target.value})} 
                    placeholder="0" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">التقدم الفني الفعلي الحالي (%)</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    required 
                    value={phaseForm.actual_progress} 
                    onChange={e => setPhaseForm({...phaseForm, actual_progress: e.target.value})} 
                    placeholder="0" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ البدء المخطط</label>
                  <input 
                    className="form-control" 
                    type="date" 
                    value={phaseForm.planned_start} 
                    onChange={e => setPhaseForm({...phaseForm, planned_start: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ التسليم المخطط</label>
                  <input 
                    className="form-control" 
                    type="date" 
                    value={phaseForm.planned_end} 
                    onChange={e => setPhaseForm({...phaseForm, planned_end: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ البدء الفعلي</label>
                  <input 
                    className="form-control" 
                    type="date" 
                    value={phaseForm.actual_start} 
                    onChange={e => setPhaseForm({...phaseForm, actual_start: e.target.value})} 
                  />
                </div>

                <div className="form-group col-span-3">
                  <label className="form-label">الوصف التفصيلي للمرحلة ونطاق العمل</label>
                  <textarea 
                    className="form-control" 
                    value={phaseForm.description} 
                    onChange={e => setPhaseForm({...phaseForm, description: e.target.value})} 
                    placeholder="مواصفات الأنابيب المستخدمة، أقطارها، تفاصيل الاختبار والضغط..." 
                    rows={2}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPhaseModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={savingPhase}>
                  {savingPhase ? 'جاري الحفظ...' : '💾 حفظ مرحلة العمل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: PRINT PROGRESS REPORT ======================== */}
      {showPrintProgressModal && (
        <div className="modal-overlay" onClick={() => setShowPrintProgressModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{ background: '#fff', color: '#000', direction: 'rtl', padding: '2rem' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1a202c' }}>🖨️ معاينة طباعة تقرير الإنجاز والتنفيذ</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة التقرير الآن</button>
                <button className="btn btn-outline" onClick={() => setShowPrintProgressModal(false)}>إغلاق</button>
              </div>
            </div>

            {/* Printable Content */}
            <div id="printable-progress-report" style={{ color: '#000', fontFamily: 'Cairo, sans-serif' }}>
              {/* Report Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{companyInfo?.company_name || 'شركة الرايق للمقاولات الكهروميكانيكية'}</h2>
                  <div style={{ fontSize: '0.85rem', color: '#444', marginTop: '4px' }}>قسم إدارة المشاريع والتنفيذ الهندسي</div>
                  <div style={{ fontSize: '0.85rem', color: '#444' }}>سجل تجاري: {companyInfo?.cr_number || '1010895421'} | الرقم الضريبي: {companyInfo?.tax_number || '300000000000003'} | الهاتف: {companyInfo?.phone || '0555555555'}</div>
                </div>
                {companyInfo?.logo_url && (
                  <img src={companyInfo.logo_url} alt="Logo" style={{ height: '60px', objectFit: 'contain' }} />
                )}
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', textDecoration: 'underline', fontWeight: 800 }}>تقرير نسبة الإنجاز والتقدم الفني للمشروع</h3>
                <div style={{ fontSize: '0.9rem', color: '#555', marginTop: '4px' }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</div>
              </div>

              {/* Project Data */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <div><strong>اسم المشروع:</strong> {project.name}</div>
                <div><strong>كود المشروع:</strong> {project.code}</div>
                <div><strong>المالك / العميل:</strong> {project.client_name || '-'}</div>
                <div><strong>الموقع:</strong> {project.location || '-'}</div>
                <div><strong>نسبة الإنجاز الفني الحالية:</strong> <span style={{ color: '#059669', fontWeight: 800 }}>{actualProgress.toFixed(1)}%</span></div>
                <div><strong>نسبة الإنجاز المخططة:</strong> {plannedProgress.toFixed(1)}%</div>
              </div>

              {/* Phases Table */}
              <h4 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0', textDecoration: 'underline' }}>📋 جدول مراحل الأعمال المنجزة والتقدم الفني:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#e2e8f0', color: '#000' }}>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>المرحلة</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>نوع الأعمال</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'center' }}>الوزن النسبي</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'center' }}>المخطط %</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'center' }}>الفعلي %</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map(p => (
                    <tr key={p.id}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontWeight: 600 }}>{p.phase_name}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>{phaseTypeLabels[p.phase_type] || p.phase_type}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{Number(p.weight_percentage || 0).toFixed(0)}%</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center' }}>{Number(p.planned_progress || 0).toFixed(0)}%</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>{Number(p.actual_progress || 0).toFixed(0)}%</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>{Number(p.actual_progress || 0) >= 100 ? 'مكتملة' : 'جاري العمل'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Progress Reports History Table */}
              <h4 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0', textDecoration: 'underline' }}>📅 سجل التقارير الأسبوعية المرفوعة من الموقع:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#e2e8f0', color: '#000' }}>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>تاريخ التقرير</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'center' }}>المخطط %</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'center' }}>الفعلي %</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>ملاحظات المهندس المشرف</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.length === 0 ? (
                    <tr><td colSpan={4} style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>لا توجد تقارير أسبوعية مرفوعة بعد</td></tr>
                  ) : (
                    progress.map(pr => (
                      <tr key={pr.id}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontWeight: 600 }}>{pr.report_date ? new Date(pr.report_date).toLocaleDateString('ar-EG') : '-'}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center' }}>{Number(pr.planned_percentage || 0).toFixed(1)}%</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>{Number(pr.actual_percentage || 0).toFixed(1)}%</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>{pr.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #ccc' }}>
                <div style={{ textAlign: 'center', width: '40%' }}>
                  <div style={{ fontWeight: 700 }}>توقيع المحاسب المالي</div>
                  <div style={{ marginTop: '2.5rem', borderBottom: '1px dashed #000' }} />
                </div>
                <div style={{ textAlign: 'center', width: '40%' }}>
                  <div style={{ fontWeight: 700 }}>اعتماد المدير العام</div>
                  <div style={{ marginTop: '2.5rem', borderBottom: '1px dashed #000' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================== MODAL: PRINT FINANCIAL & PROFIT REPORT ======================== */}
      {showPrintReportModal && (
        <div className="modal-overlay" onClick={() => setShowPrintReportModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{ background: '#fff', color: '#000', direction: 'rtl', padding: '2rem' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1a202c' }}>🖨️ معاينة طباعة تقرير الأرباح والإنجاز المالي</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة التقرير الآن</button>
                <button className="btn btn-outline" onClick={() => setShowPrintReportModal(false)}>إغلاق</button>
              </div>
            </div>

            {/* Printable Content */}
            <div id="printable-financial-report" style={{ color: '#000', fontFamily: 'Cairo, sans-serif' }}>
              {/* Report Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{companyInfo?.company_name || 'شركة الرايق للمقاولات الكهروميكانيكية'}</h2>
                  <div style={{ fontSize: '0.85rem', color: '#444', marginTop: '4px' }}>الإدارة المالية وحسابات التكاليف والربحية</div>
                  <div style={{ fontSize: '0.85rem', color: '#444' }}>سجل تجاري: {companyInfo?.cr_number || '1010895421'} | الرقم الضريبي: {companyInfo?.tax_number || '300000000000003'} | الهاتف: {companyInfo?.phone || '0555555555'}</div>
                </div>
                {companyInfo?.logo_url && (
                  <img src={companyInfo.logo_url} alt="Logo" style={{ height: '60px', objectFit: 'contain' }} />
                )}
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', textDecoration: 'underline', fontWeight: 800 }}>تقرير التحليل المالي والأرباح والإنجاز للمشروع</h3>
                <div style={{ fontSize: '0.9rem', color: '#555', marginTop: '4px' }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</div>
              </div>

              {/* Project Data */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <div><strong>اسم المشروع:</strong> {project.name}</div>
                <div><strong>كود المشروع:</strong> {project.code}</div>
                <div><strong>المالك / العميل:</strong> {project.client_name || '-'}</div>
                <div><strong>قيمة العقد الإجمالية:</strong> {formatCurrency(project.contract_value)}</div>
                <div><strong>إجمالي المستخلصات المرفوعة:</strong> {formatCurrency(totalInvoiced)}</div>
                <div><strong>المبالغ المحصلة فعلياً:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>{formatCurrency(totalCollected)}</span></div>
              </div>

              {/* Costs & Net Profit Card */}
              <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', background: '#fafafa' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', textDecoration: 'underline' }}>📊 بيان النفقات والتكاليف وصافي الربح المحقق:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div><strong>1. المصروفات النثرية والمشتريات:</strong> {formatCurrency(totalExpenses)}</div>
                  <div><strong>2. مستخلصات مقاولي الباطن:</strong> {formatCurrency(totalSubcontractorIpc)}</div>
                  <div><strong>3. تكاليف أجور عمال اليومية:</strong> {formatCurrency(totalDailyLaborCost)}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}><strong>إجمالي تكاليف ونفقات المشروع:</strong> {formatCurrency(totalExpenses + totalSubcontractorIpc + totalDailyLaborCost)}</div>
                </div>
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #ccc', fontSize: '1.2rem', fontWeight: 800, display: 'flex', justifyContent: 'space-between', color: netProjectProfit >= 0 ? '#059669' : '#dc2626' }}>
                  <span>💰 صافي ربحية المشروع الحالية:</span>
                  <span>{formatCurrency(netProjectProfit)}</span>
                </div>
              </div>

              {/* Earned Value Table */}
              <h4 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0', textDecoration: 'underline' }}>📈 القيمة المستحقة المنجزة للمراحل (Earned Value):</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#e2e8f0', color: '#000' }}>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>المرحلة</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'center' }}>الوزن المالي %</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>القيمة المالية من العقد</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'center' }}>الإنجاز الفني %</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>الأعمال المنجزة (Earned Value)</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map(phase => {
                    const phaseWeightNum = Number(phase.weight_percentage || 0);
                    const phaseProgressNum = Number(phase.actual_progress || 0);
                    const phaseVal = Number(project.contract_value || 0) * (phaseWeightNum / 100);
                    const phaseEarnedVal = phaseVal * (phaseProgressNum / 100);
                    return (
                      <tr key={phase.id}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontWeight: 600 }}>{phase.phase_name}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{phaseWeightNum.toFixed(1)}%</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>{formatCurrency(phaseVal)}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>{phaseProgressNum.toFixed(0)}%</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontWeight: 700, color: '#2563eb' }}>{formatCurrency(phaseEarnedVal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #ccc' }}>
                <div style={{ textAlign: 'center', width: '40%' }}>
                  <div style={{ fontWeight: 700 }}>توقيع المحاسب المالي</div>
                  <div style={{ marginTop: '2.5rem', borderBottom: '1px dashed #000' }} />
                </div>
                <div style={{ textAlign: 'center', width: '40%' }}>
                  <div style={{ fontWeight: 700 }}>اعتماد المدير العام</div>
                  <div style={{ marginTop: '2.5rem', borderBottom: '1px dashed #000' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .modal-overlay { position: absolute !important; left: 0 !important; top: 0 !important; background: white !important; padding: 0 !important; }
          .modal { border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          #printable-progress-report, #printable-progress-report *,
          #printable-financial-report, #printable-financial-report * { visibility: visible; }
          #printable-progress-report, #printable-financial-report { position: absolute; left: 0; top: 0; width: 100%; }
        }
      ` }} />
    </AppLayout>
  );
}
