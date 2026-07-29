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
    payment_type?: string;
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
    phase_value?: string | number;
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
    job_title?: string;
  }>;
  projectEmployees: Array<{
    id: string;
    employee_number: string;
    full_name: string;
    job_title: string;
    employment_type: string;
    base_salary: string;
    phone?: string;
    status: string;
  }>;
}

type TabType = 'overview' | 'phases' | 'progress' | 'financials' | 'documents' | 'reports' | 'inspections';

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
  piping_rough_in: 'أعمال التأسيس (مد مواسير الصلب/السيملس)',
  fixtures_install: 'تركيب المكونات (الصناديق والرشاشات والحساسات والإنذار)',
  pump_room: 'غرفة المضخات (مضخات ديزل وكهرباء وجوكي ولوحات)',
  testing_commissioning: 'الاختبار والكبس (كبس الشبكة واختبار الحساسية والإنذار)',
  inspections_permits: 'المعاينة والتراخيص (معاينة الدفاع المدني والاستشاري)',
  networks: 'شبكات حريق',
  risers: 'صواعد وهوابط',
  fixtures: 'تركيبات نهائية',
  testing: 'اختبارات وضغط',
  commissioning: 'تشغيل وتسليم',
  other: 'أعمال أخرى'
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

  // Inspections & Commissioning state
  const [inspectionReports, setInspectionReports] = useState<any[]>([]);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [selectedInspectionPhoto, setSelectedInspectionPhoto] = useState<string | null>(null);
  const [inspectionForm, setInspectionForm] = useState({
    category: 'testing_commissioning', title: '', description: '', inspector_name: '', file_url: '', report_date: new Date().toISOString().split('T')[0]
  });

  // Print modal states
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [showPrintProgressModal, setShowPrintProgressModal] = useState(false);
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);
  const [showPrintPhasesCertificate, setShowPrintPhasesCertificate] = useState(false);

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
    weight_percentage: '10',
    phase_value: '0'
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
      weight_percentage: '10',
      phase_value: '0'
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
      weight_percentage: String(phase.weight_percentage ?? '10'),
      phase_value: String(phase.phase_value ?? '0')
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
        weight_percentage: Number(phaseForm.weight_percentage) || 0,
        phase_value: Number(phaseForm.phase_value) || 0
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

  const fetchInspectionReports = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/projects/inspections?project_id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setInspectionReports(data?.data || []);
      }
    } catch (e) { console.error(e); }
  }, [id]);

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
    fetchInspectionReports();
  }, [fetchDetails, fetchInspectionReports]);

  const handleSaveInspectionReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionForm.title || !inspectionForm.file_url) {
      alert('⚠️ يرجى إدخال عنوان التقرير وإرفاق الصورة/الملف');
      return;
    }
    try {
      const res = await fetch('/api/projects/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id, ...inspectionForm })
      });
      const data = await res.json();
      if (res.ok) {
        setShowInspectionModal(false);
        setInspectionForm({ category: 'testing_commissioning', title: '', description: '', inspector_name: '', file_url: '', report_date: new Date().toISOString().split('T')[0] });
        alert(`✅ ${data.message}`);
        fetchInspectionReports();
      } else { alert(`❌ فشل الحفظ: ${data.error || 'حدث خطأ'}`); }
    } catch (err) { console.error(err); alert('❌ حدث خطأ بالاتصال'); }
  };

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
  const nonLaborExpenses = expenses.filter((e: any) => e.category !== 'labor' && e.category !== 'salaries');
  const totalExpenses = nonLaborExpenses.reduce((acc, e) => acc + Number(e.total || 0), 0);
  
  // Calculate dynamic average/weighted progress
  const totalWeight = phases.reduce((acc, p) => acc + Number(p.weight_percentage || 0), 0);
  const actualProgress = totalWeight > 0 
    ? (phases.reduce((acc, p) => acc + (Number(p.actual_progress || 0) * Number(p.weight_percentage || 0)), 0) / totalWeight)
    : (phases.length > 0 ? (phases.reduce((acc, p) => acc + Number(p.actual_progress || 0), 0) / phases.length) : 0);

  const plannedProgress = totalWeight > 0 
    ? (phases.reduce((acc, p) => acc + (Number(p.planned_progress || 0) * Number(p.weight_percentage || 0)), 0) / totalWeight)
    : (phases.length > 0 ? (phases.reduce((acc, p) => acc + Number(p.planned_progress || 0), 0) / phases.length) : 0);

  const getDailyRate = (a: any) => {
    const base = Number(a.base_salary || 0);
    if (!base) return 150;
    if (a.employment_type === 'daily') return base;
    let daysInMonth = 30;
    if (a.attendance_date) {
      const d = new Date(a.attendance_date);
      if (!isNaN(d.getTime())) {
        daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      }
    }
    return base / daysInMonth;
  };

  // Financial calculations
  const earnedValue = Number(project.contract_value || 0) * (actualProgress / 100);
  const totalInvoiced = ipcs.filter(i => i.status === 'paid' || i.status === 'client_approved' || i.status === 'pending_payment').reduce((acc, i) => acc + Number(i.net_payable || 0), 0);
  const totalCollected = ipcs.filter(i => i.status === 'paid').reduce((acc, i) => acc + Number(i.net_payable || 0), 0);
  const totalSubcontractorIpc = subIpcs.filter(s => s.status === 'paid' || s.status === 'approved' || s.status === 'submitted').reduce((acc, s) => acc + Number(s.net_payable || 0), 0);
  const totalDailyLaborCost = laborAttendance.reduce((acc, a) => {
    const rate = getDailyRate(a);
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
        <button className={`tab-btn ${activeTab === 'inspections' ? 'active' : ''}`} onClick={() => setActiveTab('inspections')}>📑 المعاينات واختبارات التشغيل ({inspectionReports.length})</button>
        <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>📊 تقارير الأرباح والإنجاز</button>
      </div>

      {/* ======================== TAB: OVERVIEW ======================== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Row (Solid Premium Style) */}
          <div className="project-kpi-grid">
            {/* قيمة العقد */}
            <div className="project-kpi-card blue">
              <div className="card-content">
                <span className="card-value">{formatCurrency(project.contract_value)}</span>
                <span className="card-label">قيمة العقد</span>
                {project.payment_type && (
                  <span className="card-subtext">
                    ({project.payment_type === 'once' ? 'دفعة واحدة' : 'على دفعات'})
                  </span>
                )}
                <a href={`/projects/${id}/contract`} className="kpi-detail-btn">تفاصيل ←</a>
              </div>
              <div className="card-icon-watermark">📄</div>
            </div>

            {/* إجمالي التكاليف */}
            <div className="project-kpi-card red">
              <div className="card-content">
                <span className="card-value">{formatCurrency(totalExpenses + totalSubcontractorIpc)}</span>
                <span className="card-label">إجمالي التكاليف</span>
                <span className="card-subtext">مصاريف + مقاولين</span>
                <a href={`/projects/${id}/costs`} className="kpi-detail-btn">تفاصيل ←</a>
              </div>
              <div className="card-icon-watermark">💸</div>
            </div>

            {/* يوميات العمال والمشرفين */}
            <div className="project-kpi-card orange">
              <div className="card-content">
                <span className="card-value">{formatCurrency(totalDailyLaborCost)}</span>
                <span className="card-label">يوميات العمال والمشرفين</span>
                <span className="card-subtext">الحضور الفعلي للموقع</span>
                <a href={`/projects/${id}/labor`} className="kpi-detail-btn">تفاصيل ←</a>
              </div>
              <div className="card-icon-watermark">👥</div>
            </div>

            {/* صافي الربح */}
            <div className="project-kpi-card green">
              <div className="card-content">
                <span className="card-value">{formatCurrency(netProjectProfit)}</span>
                <span className="card-label">صافي الربح</span>
                <span className="card-subtext">المستخلصات المعتمدة - التكاليف</span>
                <a href={`/projects/${id}/profit`} className="kpi-detail-btn">تفاصيل ←</a>
              </div>
              <div className="card-icon-watermark">📈</div>
            </div>
          </div>

          {/* Core Info Details Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📝 بطاقة تعريف المشروع والموقع</div>
              <div className="card-subtitle">البيانات الأساسية وتفاصيل الاتصال الخاصة بالمشروع</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-normal)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>👤 اسم العميل</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{project.client_name}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-normal)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>📞 وسيلة الاتصال بالعميل</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{project.client_contact || '-'}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-normal)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>📍 الموقع الجغرافي</span>
                <span style={{ fontWeight: 600, color: 'var(--brand-primary-light)', fontSize: '0.9rem' }}>{project.location || '-'}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-normal)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>📅 تاريخ البدء</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{project.start_date ? new Date(project.start_date).toLocaleDateString('ar-EG') : '-'}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-normal)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>🏁 تاريخ التسليم المتوقع</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{project.end_date ? new Date(project.end_date).toLocaleDateString('ar-EG') : '-'}</span>
              </div>
            </div>
            
            {project.description && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>الوصف ونطاق العمل</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{project.description}</p>
              </div>
            )}
          </div>

          {/* Project Crew & Employees Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            
            {/* HR Assigned Employees */}
            <div className="card" style={{ flex: 1 }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <div className="card-title">👨‍💼 فريق عمل المشروع (المسجلين بالموارد البشرية)</div>
                <div className="card-subtitle">المهندسين، الفنيين والمشرفين المعينين على قوة هذا المشروع</div>
              </div>
              <div style={{ padding: '1rem' }}>
                {!details?.projectEmployees || details.projectEmployees.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                     لا يوجد موظفون معينون بشكل دائم على قوة هذا المشروع في شؤون الموظفين حالياً.
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>الرقم الوظيفي</th>
                          <th>الاسم</th>
                          <th>الوظيفة</th>
                          <th>نوع التوظيف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.projectEmployees.map(emp => (
                          <tr key={emp.id}>
                            <td style={{ fontWeight: 700 }}>{emp.employee_number}</td>
                            <td style={{ fontWeight: 600 }}>{emp.full_name}</td>
                            <td>{emp.job_title}</td>
                            <td>
                              <span className={`badge ${emp.employment_type === 'daily' ? 'badge-warning' : 'badge-primary'}`}>
                                {emp.employment_type === 'daily' ? 'يومية' : 'شهري'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Daily Labor Attendance Logs */}
            <div className="card" style={{ flex: 1 }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <div className="card-title">👷‍♂️ عمالة اليوميات المسجلة بالموقع (من السركي)</div>
                <div className="card-subtitle">سجل الحضور اليومي وأجور العمال المنعكسة في مصروفات المشروع</div>
              </div>
              <div style={{ padding: '1rem' }}>
                {!details?.laborAttendance || details.laborAttendance.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                     لم يتم تسجيل أي حضور يومي أو سركي عمالة للموقع في هذا المشروع حتى الآن.
                  </div>
                ) : (
                  <div className="table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>التاريخ</th>
                          <th>العامل / الفني</th>
                          <th>نوع الحضور</th>
                          <th>أجر اليومية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.laborAttendance.map((a, idx) => {
                          const rate = Number(a.base_salary || 150);
                          let cost = rate;
                          if (a.attendance_type === 'half_day') cost = rate / 2;
                          else if (a.attendance_type === 'absent') cost = 0;
                          
                          const ot = Number(a.overtime_hours || 0) * 25;
                          const total = cost + ot;

                          return (
                            <tr key={a.id || idx}>
                              <td>{new Date(a.attendance_date).toLocaleDateString('ar-EG')}</td>
                              <td style={{ fontWeight: 600 }}>{a.employee_name}</td>
                              <td>
                                <span className={`badge ${a.attendance_type === 'present' ? 'badge-success' : a.attendance_type === 'half_day' ? 'badge-warning' : 'badge-danger'}`}>
                                  {a.attendance_type === 'present' ? 'يومية كاملة' : a.attendance_type === 'half_day' ? 'نصف يومية' : 'غياب'}
                                </span>
                              </td>
                              <td style={{ fontWeight: 700 }}>{formatCurrency(total)}</td>
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
        </div>
      )}

      {/* ======================== TAB: PHASES ======================== */}
      {activeTab === 'phases' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">📈 مراحل تنفيذ الأعمال وجدول التقدم الفني والمالي</div>
              <div className="card-subtitle">تتبع نسب إنجاز أعمال الشبكات والتركيبات وتفاصيل تواريخ التنفيذ وسعر كل مرحلة للمستخلصات</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-success" onClick={() => setShowPrintPhasesCertificate(true)}>
                🖨️ طباعة مستخلص مراحل العمل
              </button>
              <button className="btn btn-primary" onClick={handleOpenCreatePhase}>
                ➕ إضافة مرحلة عمل جديدة
              </button>
            </div>
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
                    <th>سعر المرحلة (ج.م)</th>
                    <th>النسبة الفعلية</th>
                    <th>المستحق المنجز (ج.م)</th>
                    <th>الحالة والتقدم</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>العمليات</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map(phase => {
                    const actualProgressNum = Number(phase.actual_progress || 0);
                    const phasePrice = Number(phase.phase_value || 0);
                    const earnedAmount = (phasePrice * actualProgressNum) / 100;
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
                          {formatCurrency(phasePrice)}
                        </td>
                        <td style={{ fontWeight: 'bold', color: 'var(--status-success)' }}>
                          {actualProgressNum.toFixed(0)}%
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--brand-primary-light)' }}>
                          {formatCurrency(earnedAmount)}
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
                          <td>{debt.due_date ? new Date(debt.due_date).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-'}</td>
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
                            تاريخ الرفع: {new Date(doc.uploaded_at).toLocaleDateString('ar-EG', { calendar: 'gregory' })}
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

      {/* ======================== TAB: INSPECTIONS & COMMISSIONING ======================== */}
      {activeTab === 'inspections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div className="page-header-left">
              <div className="page-title">📑 التقارير الفنية واختبارات التشغيل والدفاع المدني</div>
              <div className="page-description">إرفاق وتصفح صور المعاينة الميدانية بالموقع، تقارير الضغط والتشغيل والتسليم (Testing & Commissioning)، واعتمادات الدفاع المدني</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowInspectionModal(true)}>+ إرفاق تقرير / شهادة جديدة</button>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-card card-kpi-projects">
              <div className="stat-card-icon">📸</div>
              <div className="stat-value">{inspectionReports.filter(r => r.category === 'site_photos').length}</div>
              <div className="stat-label">صور ومعاينات الموقع</div>
            </div>
            <div className="stat-card card-kpi-employees">
              <div className="stat-card-icon">🧪</div>
              <div className="stat-value">{inspectionReports.filter(r => r.category === 'testing_commissioning').length}</div>
              <div className="stat-label">تقارير الاختبارات والتشغيل (Testing)</div>
            </div>
            <div className="stat-card card-kpi-tickets">
              <div className="stat-card-icon">🚒</div>
              <div className="stat-value">{inspectionReports.filter(r => r.category === 'civil_defense_cert').length}</div>
              <div className="stat-label">شهادات واعتمادات الدفاع المدني</div>
            </div>
            <div className="stat-card card-kpi-documents">
              <div className="stat-card-icon">📑</div>
              <div className="stat-value">{inspectionReports.length}</div>
              <div className="stat-label">إجمالي الملفات المرفقة للمشروع</div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0' }}>
              📁 السجل الفني والشهادات المعتمدة للمشروع
            </div>
            {inspectionReports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📑</div>
                <div className="empty-state-title">لا توجد تقارير معاينة أو شهادات اختبارات مرفقة للمشروع بعد</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => setShowInspectionModal(true)}>+ إرفاق تقرير معاينة جديد</button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>نوع التقرير</th>
                      <th>العنوان والوصف</th>
                      <th>التاريخ</th>
                      <th>المهندس / الفاحص</th>
                      <th>الملف المرفق / الصورة</th>
                      <th style={{ textAlign: 'center' }}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionReports.map((report: any) => (
                      <tr key={report.id}>
                        <td>
                          {report.category === 'testing_commissioning' ? (
                            <span className="badge badge-success">🧪 اختبارات وتعديل (Testing & Commissioning)</span>
                          ) : report.category === 'civil_defense_cert' ? (
                            <span className="badge badge-danger">🚒 شهادة دفاع مدني معتمدة</span>
                          ) : report.category === 'site_photos' ? (
                            <span className="badge badge-primary">📸 معاينة وصور موقع</span>
                          ) : (
                            <span className="badge badge-muted">📄 تقرير آخر</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          <div>{report.title}</div>
                          {report.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{report.description}</div>}
                        </td>
                        <td>{new Date(report.report_date).toLocaleDateString('ar-EG')}</td>
                        <td style={{ fontWeight: 600 }}>{report.inspector_name || 'مهندس الموقع'}</td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => setSelectedInspectionPhoto(report.file_url)}>
                            🖼️ معاينة التقرير / الصورة
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn btn-ghost text-danger btn-sm" onClick={async () => {
                            if (!confirm('⚠️ هل أنت متأكد من حذف هذا التقرير؟')) return;
                            await fetch(`/api/projects/inspections?id=${report.id}`, { method: 'DELETE' });
                            fetchInspectionReports();
                          }}>🗑️ حذف</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                  <label className="form-label">سعر/قيمة المرحلة المالي (ج.م)</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    required 
                    value={phaseForm.phase_value} 
                    onChange={e => setPhaseForm({...phaseForm, phase_value: e.target.value})} 
                    placeholder="0.00" 
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
        <div className="modal-overlay print-modal-overlay" onClick={() => setShowPrintProgressModal(false)} style={{ zIndex: 9999 }}>
          <div
            className="modal modal-xl print-modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              color: '#000',
              direction: 'rtl',
              padding: '1.5rem 2rem 2rem 2rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              maxWidth: '900px',
              width: '95%',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              margin: 'auto'
            }}
          >
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                html, body {
                  background: #fff !important;
                  color: #000 !important;
                  height: auto !important;
                  overflow: visible !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #printable-progress-report, #printable-progress-report * {
                  visibility: visible !important;
                }
                #printable-progress-report {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                  background: #fff !important;
                  color: #000 !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            ` }} />
            <div
              className="no-print"
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: '#fff',
                paddingTop: '0.5rem',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e293b' }}>🖨️ معاينة طباعة تقرير الإنجاز والتنفيذ</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={() => window.print()} style={{ fontWeight: 700 }}>🖨️ طباعة التقرير الآن</button>
                <button className="btn btn-outline" onClick={() => setShowPrintProgressModal(false)}>إغلاق المعاينة</button>
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
        <div className="modal-overlay print-modal-overlay" onClick={() => setShowPrintReportModal(false)} style={{ zIndex: 9999 }}>
          <div
            className="modal modal-xl print-modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              color: '#000',
              direction: 'rtl',
              padding: '1.5rem 2rem 2rem 2rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              maxWidth: '900px',
              width: '95%',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              margin: 'auto'
            }}
          >
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                html, body {
                  background: #fff !important;
                  color: #000 !important;
                  height: auto !important;
                  overflow: visible !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #printable-financial-report, #printable-financial-report * {
                  visibility: visible !important;
                }
                #printable-financial-report {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                  background: #fff !important;
                  color: #000 !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            ` }} />
            <div
              className="no-print"
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: '#fff',
                paddingTop: '0.5rem',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e293b' }}>🖨️ معاينة طباعة تقرير الأرباح والإنجاز المالي</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={() => window.print()} style={{ fontWeight: 700 }}>🖨️ طباعة التقرير الآن</button>
                <button className="btn btn-outline" onClick={() => setShowPrintReportModal(false)}>إغلاق المعاينة</button>
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

              {/* Project Crew & Assigned Employees (Print Section) */}
              <h4 style={{ fontSize: '1.05rem', margin: '1.5rem 0 0.5rem 0', fontWeight: 'bold', textDecoration: 'underline' }}>👨‍💼 الكادر الإداري وفريق عمل المشروع:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#000' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right' }}>الرقم الوظيفي</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right' }}>الاسم الكامل</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right' }}>المسمى الوظيفي</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center' }}>نوع التوظيف</th>
                  </tr>
                </thead>
                <tbody>
                  {!details?.projectEmployees || details.projectEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', color: '#666' }}>
                        لا يوجد موظفون معينون بشكل دائم على المشروع بالموارد البشرية.
                      </td>
                    </tr>
                  ) : (
                    details.projectEmployees.map(emp => (
                      <tr key={emp.id}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>{emp.employee_number}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontWeight: 600 }}>{emp.full_name}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>{emp.job_title}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center' }}>
                          {emp.employment_type === 'daily' ? 'يومية' : 'شهري'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Labor Attendance Logs (Print Section) */}
              <h4 style={{ fontSize: '1.05rem', margin: '1.5rem 0 0.5rem 0', fontWeight: 'bold', textDecoration: 'underline' }}>👷‍♂️ سجل حضور عمالة اليوميات وسركي الموقع:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#000' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right' }}>التاريخ</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right' }}>العامل / الفني</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right' }}>المسمى الوظيفي</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center' }}>نوع الحضور</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right' }}>التكلفة المباشرة</th>
                  </tr>
                </thead>
                <tbody>
                  {!details?.laborAttendance || details.laborAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', color: '#666' }}>
                        لا توجد سجلات أجور أو حضور عمالة يومية للموقع.
                      </td>
                    </tr>
                  ) : (
                    details.laborAttendance.map((a, idx) => {
                      const rate = Number(a.base_salary || 150);
                      let cost = rate;
                      if (a.attendance_type === 'half_day') cost = rate / 2;
                      else if (a.attendance_type === 'absent') cost = 0;
                      
                      const ot = Number(a.overtime_hours || 0) * 25;
                      const total = cost + ot;

                      return (
                        <tr key={a.id || idx}>
                          <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>{new Date(a.attendance_date).toLocaleDateString('ar-EG')}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontWeight: 600 }}>{a.employee_name}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>{a.job_title || 'عامل'}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center' }}>
                            {a.attendance_type === 'present' ? 'يومية كاملة' : a.attendance_type === 'half_day' ? 'نصف يومية' : 'غياب'}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontWeight: 700 }}>{formatCurrency(total)}</td>
                        </tr>
                      );
                    })
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

      {/* ======================== MODAL: UPLOAD INSPECTION REPORT / CERTIFICATE ======================== */}
      {showInspectionModal && (
        <div className="modal-overlay" onClick={() => setShowInspectionModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📑 إرفاق تقرير معاينة أو شهادة اختبارات وتأهيل</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowInspectionModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveInspectionReport}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label required">تصنيف التقرير / الملف</label>
                  <select className="form-control" value={inspectionForm.category} onChange={e => setInspectionForm({...inspectionForm, category: e.target.value})}>
                    <option value="testing_commissioning">🧪 تقارير ضغط واختبارات تشغيل وتعديل (Testing & Commissioning)</option>
                    <option value="civil_defense_cert">🚒 شهادة وإعتماد الدفاع المدني للمشروع</option>
                    <option value="site_photos">📸 صور واختبارات المعاينة الميدانية بالموقع</option>
                    <option value="other_reports">📄 تقارير فنية واستشارية أخرى</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">اسم / عنوان التقرير والشهادة</label>
                  <input className="form-control" required value={inspectionForm.title} onChange={e => setInspectionForm({...inspectionForm, title: e.target.value})} placeholder="تقرير ضغط شبكة الإطفاء بالهواء، شهادة استلام..." />
                </div>
                <div className="form-group">
                  <label className="form-label">اسم المهندس / الفاحص المعتمد</label>
                  <input className="form-control" value={inspectionForm.inspector_name} onChange={e => setInspectionForm({...inspectionForm, inspector_name: e.target.value})} placeholder="م. أحمد علي - استشاري المشروع..." />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ التقرير / الاعتماد</label>
                  <input className="form-control" type="date" value={inspectionForm.report_date} onChange={e => setInspectionForm({...inspectionForm, report_date: e.target.value})} />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">الوصف والملحوظات الفنية</label>
                  <textarea className="form-control" rows={2} value={inspectionForm.description} onChange={e => setInspectionForm({...inspectionForm, description: e.target.value})} placeholder="نتيجة الاختبار: ضغط 12 بار لمدة 24 ساعة بدون انخفاض..." />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label required">📷 صورة التقرير / الشهادة / المعاينة الورقية</label>
                  <input
                    className="form-control"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setInspectionForm({...inspectionForm, file_url: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {inspectionForm.file_url && (
                    <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                      <img src={inspectionForm.file_url} alt="معاينة الملف" style={{ maxHeight: '120px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowInspectionModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 إرفاق التقرير بالسجل الفني</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: VIEW INSPECTION FILE ======================== */}
      {selectedInspectionPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedInspectionPhoto(null)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🖼️ معاينة التقرير / الصورة المرفقة للمشروع</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedInspectionPhoto(null)}>✕</button>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <img src={selectedInspectionPhoto} alt="صورة التقرير الفني" style={{ maxWidth: '100%', maxHeight: '450px', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setSelectedInspectionPhoto(null)}>إغلاق المعاينة</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================== MODAL: PRINT WORK PHASES CERTIFICATE ======================== */}
      {showPrintPhasesCertificate && (
        <div className="modal-overlay print-modal-overlay" onClick={() => setShowPrintPhasesCertificate(false)} style={{ zIndex: 9999 }}>
          <div
            className="modal modal-xl print-modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              color: '#000',
              direction: 'rtl',
              padding: '1.5rem 2rem 2rem 2rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              maxWidth: '900px',
              width: '95%',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              margin: 'auto'
            }}
          >
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                html, body {
                  background: #fff !important;
                  color: #000 !important;
                  height: auto !important;
                  overflow: visible !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #printable-phases-certificate, #printable-phases-certificate * {
                  visibility: visible !important;
                }
                #printable-phases-certificate {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                  background: #fff !important;
                  color: #000 !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            ` }} />
            <div
              className="no-print"
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: '#fff',
                paddingTop: '0.5rem',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e293b' }}>🖨️ معاينة طباعة مستخلص فني ومالي لمراحل العمل</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-success" onClick={() => window.print()} style={{ fontWeight: 700 }}>🖨️ طباعة المستخلص الآن</button>
                <button className="btn btn-outline" onClick={() => setShowPrintPhasesCertificate(false)}>إغلاق المعاينة</button>
              </div>
            </div>

            {/* Printable Content */}
            <div id="printable-phases-certificate" style={{ color: '#000', fontFamily: 'Cairo, sans-serif' }}>
              {/* Report Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{companyInfo?.company_name || 'شركة الرايق للمقاولات الكهروميكانيكية'}</h2>
                  <div style={{ fontSize: '0.85rem', color: '#444', marginTop: '4px' }}>الإدارة الهندسية وحسابات التكاليف والمستخلصات</div>
                  <div style={{ fontSize: '0.85rem', color: '#444' }}>سجل تجاري: {companyInfo?.cr_number || '1010895421'} | الرقم الضريبي: {companyInfo?.tax_number || '300000000000003'} | الهاتف: {companyInfo?.phone || '0555555555'}</div>
                </div>
                {companyInfo?.logo_url && (
                  <img src={companyInfo.logo_url} alt="Logo" style={{ height: '60px', objectFit: 'contain' }} />
                )}
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', textDecoration: 'underline', fontWeight: 800 }}>مستخلص قيمة مراحل العمل المنجزة (فني ومالي)</h3>
                <div style={{ fontSize: '0.9rem', color: '#555', marginTop: '4px' }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</div>
              </div>

              {/* Project Data */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <div><strong>اسم المشروع:</strong> {project.name}</div>
                <div><strong>كود المشروع:</strong> {project.code}</div>
                <div><strong>المالك / العميل:</strong> {project.client_name || '-'}</div>
                <div><strong>قيمة العقد الإجمالية:</strong> {formatCurrency(project.contract_value)}</div>
              </div>

              {/* Phases Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#e2e8f0', color: '#000' }}>
                    <th style={{ border: '1px solid #94a3b8', padding: '8px 10px', textAlign: 'right' }}>المرحلة</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '8px 10px', textAlign: 'right' }}>نوع الأعمال</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '8px 10px', textAlign: 'right' }}>سعر المرحلة (ج.م)</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '8px 10px', textAlign: 'center' }}>النسبة الفعلية الحالية</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '8px 10px', textAlign: 'right' }}>القيمة المنجزة المستحقة (ج.م)</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map(p => {
                    const price = Number(p.phase_value || 0);
                    const progress = Number(p.actual_progress || 0);
                    const earned = (price * progress) / 100;
                    return (
                      <tr key={p.id}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px', fontWeight: 600 }}>{p.phase_name}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px' }}>{phaseTypeLabels[p.phase_type] || p.phase_type}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px' }}>{formatCurrency(price)}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>{progress.toFixed(0)}%</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px', fontWeight: 700, color: '#2563eb' }}>{formatCurrency(earned)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Total Calculation Summary */}
              {(() => {
                const totalValueSum = phases.reduce((sum, p) => sum + Number(p.phase_value || 0), 0);
                const totalEarnedSum = phases.reduce((sum, p) => sum + (Number(p.phase_value || 0) * Number(p.actual_progress || 0) / 100), 0);
                const overallPercentage = totalValueSum > 0 ? (totalEarnedSum / totalValueSum) * 100 : 0;
                return (
                  <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '1.25rem', marginBottom: '2rem', background: '#fafafa' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', textDecoration: 'underline' }}>📊 بيان القيمة الإجمالية للمستخلص المحتسب:</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.9rem' }}>
                      <div><strong>إجمالي القيمة المسعرة للمراحل:</strong> {formatCurrency(totalValueSum)}</div>
                      <div><strong>نسبة الإنجاز المالي الإجمالية للمستخلص:</strong> {overallPercentage.toFixed(1)}%</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', gridColumn: 'span 2', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between' }}>
                        <span>💰 إجمالي مستخلص الأعمال المنجزة المستحق:</span>
                        <span>{formatCurrency(totalEarnedSum)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #ccc' }}>
                <div style={{ textAlign: 'center', width: '40%' }}>
                  <div style={{ fontWeight: 700 }}>استشاري الإشراف الفني</div>
                  <div style={{ marginTop: '2.5rem', borderBottom: '1px dashed #000' }} />
                </div>
                <div style={{ textAlign: 'center', width: '40%' }}>
                  <div style={{ fontWeight: 700 }}>اعتماد المدير العام للشركة</div>
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
          #printable-phases-certificate, #printable-phases-certificate *,
          #printable-financial-report, #printable-financial-report * { visibility: visible; }
          #printable-progress-report, #printable-financial-report, #printable-phases-certificate { position: absolute; left: 0; top: 0; width: 100%; }
        }
      ` }} />
    </AppLayout>
  );
}
