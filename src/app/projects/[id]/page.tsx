'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

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
}

type TabType = 'overview' | 'phases' | 'progress' | 'financials';

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

function formatCurrency(val: string | number) {
  return Number(val).toLocaleString('ar-EG') + ' ج.م';
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;

  const [details, setDetails] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    const fetchDetails = async () => {
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
    };
    fetchDetails();
  }, [id]);

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

  const { project, phases, progress, expenses, ipcs, subIpcs } = details;
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.total || 0), 0);

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
        <button className={`tab-btn ${activeTab === 'phases' ? 'active' : ''}`} onClick={() => setActiveTab('phases')}>📈 مراحل العمل</button>
        <button className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`} onClick={() => setActiveTab('progress')}>📋 تقارير الإنجاز</button>
        <button className={`tab-btn ${activeTab === 'financials' ? 'active' : ''}`} onClick={() => setActiveTab('financials')}>💰 الحسابات والمصروفات</button>
      </div>

      {/* ======================== TAB: OVERVIEW ======================== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Row */}
          <div className="stat-grid">
            <div className="stat-card accent">
              <div className="stat-card-icon">💰</div>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{formatCurrency(project.contract_value)}</div>
              <div className="stat-label">القيمة التعاقدية للمشروع</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-card-icon">📊</div>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{formatCurrency(totalExpenses)}</div>
              <div className="stat-label">إجمالي المصروفات المنفقة</div>
            </div>
            <div className="stat-card success">
              <div className="stat-card-icon">👷</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{project.engineer_name || 'غير محدد'}</div>
              <div className="stat-label">المهندس المشرف بالموقع</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon">👨‍💼</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{project.manager_name || 'غير محدد'}</div>
              <div className="stat-label">مدير المشروع (PM)</div>
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
          <div className="card-header">
            <div className="card-title">📈 مراحل تنفيذ الأعمال وجدول التقدم الفني</div>
            <div className="card-subtitle">تتبع نسب إنجاز أعمال الشبكات والتركيبات وتفاصيل تواريخ التنفيذ</div>
          </div>
          {phases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📈</div>
              <div className="empty-state-title">لا توجد مراحل مسجلة لهذا المشروع</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المرحلة</th>
                    <th>نوع الأعمال</th>
                    <th>مخطط البدء/الانتهاء</th>
                    <th>النسبة المخططة</th>
                    <th>النسبة الفعلية الحالية</th>
                    <th>الحالة والتقدم</th>
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
                        <td style={{ fontWeight: 'bold' }}>{Number(phase.planned_progress).toFixed(0)}%</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--brand-primary-light)' }}>
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
          <div className="card-header">
            <div className="card-title">📋 سجل تقارير نسب الإنجاز الأسبوعية</div>
            <div className="card-subtitle">التقارير المرفوعة دورياً من المشرفين والمهندسين بالموقع</div>
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
        </div>
      )}
    </AppLayout>
  );
}
