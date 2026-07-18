'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8',
        font: { family: 'Cairo', size: 12 },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#64748b', font: { family: 'Cairo' } },
      grid: { color: 'rgba(100, 116, 139, 0.12)' },
    },
    y: {
      ticks: { color: '#64748b', font: { family: 'Cairo' } },
      grid: { color: 'rgba(100, 116, 139, 0.12)' },
    },
  },
};

interface DashboardData {
  stats: {
    projects: Array<{ status: string; count: string; total_value: string }>;
    employees: { total: string; active: string };
    maintenance: { total: string; active: string };
    monthlyExpenses: { total: string };
    yearlyRevenue: { total: string };
    faultTickets: { total_tickets: string; open_tickets: string };
    expiringDocs: { expiring: string };
    pendingOvertime: { pending: string };
  };
  recentProjects: Array<{
    id: string; name: string; code: string; status: string;
    contract_value: string; avg_progress: string; client_name: string;
  }>;
  expensesTrend: Array<{ month: string; total: string }>;
  projectProgress: Array<{ name: string; code: string; actual: string; planned: string }>;
  laborCost: Array<{ project_name: string; daily_labor_total: string; salary_allocated_total: string }>;
  recentTickets: Array<{ id: string; ticket_number: string; client_name: string; urgency: string; status: string; fault_description: string }>;
}

const statusLabels: Record<string, string> = {
  active: 'نشط', completed: 'مكتمل', suspended: 'متوقف', tender: 'مناقصة'
};
const statusBadge: Record<string, string> = {
  active: 'badge-success', completed: 'badge-primary', suspended: 'badge-warning', tender: 'badge-purple'
};
const urgencyBadge: Record<string, string> = {
  emergency: 'badge-danger', urgent: 'badge-warning', normal: 'badge-primary'
};
const urgencyLabels: Record<string, string> = {
  emergency: 'طارئ', urgent: 'عاجل', normal: 'عادي'
};
const ticketStatusLabels: Record<string, string> = {
  open: 'مفتوح', assigned: 'مُسنَد', in_progress: 'جاري', resolved: 'تم الحل', closed: 'مغلق'
};

function formatCurrency(val: string | number) {
  const n = Number(val);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}م`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}ك`;
  return n.toFixed(0);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrencySymbol(localStorage.getItem('system_currency_symbol') || 'ج.م');
    }
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const activeProjects = data?.stats?.projects?.find(p => p.status === 'active');
  const completedProjects = data?.stats?.projects?.find(p => p.status === 'completed');
  const totalContractValue = data?.stats?.projects?.reduce((s, p) => s + Number(p.total_value || 0), 0) || 0;

  const expensesChartData = {
    labels: data?.expensesTrend.map(e => e.month) || [],
    datasets: [
      {
        label: `المصروفات الشهرية (${currencySymbol})`,
        data: data?.expensesTrend.map(e => Number(e.total)) || [],
        fill: true,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 4,
      },
    ],
  };

  const progressChartData = {
    labels: data?.projectProgress.map(p => p.code) || [],
    datasets: [
      {
        label: 'الإنجاز الفعلي %',
        data: data?.projectProgress.map(p => Number(p.actual).toFixed(1)) || [],
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderColor: '#3b82f6',
        borderRadius: 6,
        borderWidth: 0,
      },
      {
        label: 'الإنجاز المخطط %',
        data: data?.projectProgress.map(p => Number(p.planned).toFixed(1)) || [],
        backgroundColor: 'rgba(245,158,11,0.7)',
        borderColor: '#f59e0b',
        borderRadius: 6,
        borderWidth: 0,
      },
    ],
  };

  const laborChartData = {
    labels: data?.laborCost.map(l => l.project_name?.substring(0, 20) + '...' || '') || [],
    datasets: [
      {
        label: 'عمالة يومية',
        data: data?.laborCost.map(l => Number(l.daily_labor_total)) || [],
        backgroundColor: 'rgba(16,185,129,0.7)',
        borderRadius: 6,
      },
      {
        label: 'رواتب موزعة',
        data: data?.laborCost.map(l => Number(l.salary_allocated_total)) || [],
        backgroundColor: 'rgba(139,92,246,0.7)',
        borderRadius: 6,
      },
    ],
  };

  const projectStatusData = {
    labels: data?.stats?.projects?.map(p => statusLabels[p.status] || p.status) || [],
    datasets: [{
      data: data?.stats?.projects?.map(p => Number(p.count)) || [],
      backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(16,185,129,0.8)', 'rgba(245,158,11,0.8)', 'rgba(139,92,246,0.8)'],
      borderWidth: 0,
    }],
  };

  return (
    <AppLayout title="لوحة التحكم" subtitle="نظرة عامة على أداء الشركة" icon="📊">
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Stats */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card-icon">🏗️</div>
              <div className="stat-value">{activeProjects?.count || 0}</div>
              <div className="stat-label">مشاريع نشطة</div>
              <div className="stat-change positive">▲ {completedProjects?.count || 0} مكتمل</div>
              <a href="/dashboard/details/projects" className="stat-card-link">عرض التفاصيل ←</a>
            </div>

            <div className="stat-card accent">
              <div className="stat-card-icon">💰</div>
              <div className="stat-value">{formatCurrency(totalContractValue)}</div>
              <div className="stat-label">إجمالي قيمة العقود ({currencySymbol})</div>
              <div className="stat-change positive">▲ إيرادات {formatCurrency(data?.stats?.yearlyRevenue?.total || 0)} هذا العام</div>
              <a href="/dashboard/details/contracts" className="stat-card-link">عرض التفاصيل ←</a>
            </div>

            <div className="stat-card success">
              <div className="stat-card-icon">👷</div>
              <div className="stat-value">{data?.stats?.employees?.active || 0}</div>
              <div className="stat-label">موظف نشط</div>
              <div className="stat-change positive">من إجمالي {data?.stats?.employees?.total || 0} موظف</div>
              <a href="/dashboard/details/employees" className="stat-card-link">عرض التفاصيل ←</a>
            </div>

            <div className="stat-card danger">
              <div className="stat-card-icon">🔧</div>
              <div className="stat-value">{data?.stats?.faultTickets?.open_tickets || 0}</div>
              <div className="stat-label">بلاغات أعطال مفتوحة</div>
              <div className="stat-change negative">من {data?.stats?.faultTickets?.total_tickets || 0} إجمالي</div>
              <a href="/dashboard/details/tickets" className="stat-card-link">عرض التفاصيل ←</a>
            </div>

            <div className="stat-card purple">
              <div className="stat-card-icon">📄</div>
              <div className="stat-value">{data?.stats?.expiringDocs?.expiring || 0}</div>
              <div className="stat-label">وثائق تنتهي خلال 30 يوم</div>
              <div className="stat-change negative">تحتاج تجديد</div>
              <a href="/dashboard/details/documents" className="stat-card-link">عرض التفاصيل ←</a>
            </div>

            <div className="stat-card accent">
              <div className="stat-card-icon">⏰</div>
              <div className="stat-value">{data?.stats?.pendingOvertime?.pending || 0}</div>
              <div className="stat-label">طلبات عمل إضافي معلقة</div>
              <div className="stat-change">بانتظار الاعتماد</div>
              <a href="/dashboard/details/overtime" className="stat-card-link">عرض التفاصيل ←</a>
            </div>

            <div className="stat-card success">
              <div className="stat-card-icon">🔐</div>
              <div className="stat-value">{data?.stats?.maintenance?.active || 0}</div>
              <div className="stat-label">عقود صيانة نشطة</div>
              <div className="stat-change positive">من {data?.stats?.maintenance?.total || 0} إجمالي</div>
              <a href="/dashboard/details/maintenance" className="stat-card-link">عرض التفاصيل ←</a>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon">📊</div>
              <div className="stat-value">{formatCurrency(data?.stats?.monthlyExpenses?.total || 0)}</div>
              <div className="stat-label">مصروفات هذا الشهر ({currencySymbol})</div>
              <div className="stat-change">إجمالي المصروفات</div>
              <a href="/dashboard/details/expenses" className="stat-card-link">عرض التفاصيل ←</a>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="dashboard-grid-2-1" style={{ marginBottom: '1.25rem' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">📈 المصروفات الشهرية (آخر 6 أشهر)</div>
              </div>
              <div className="chart-container" style={{ height: '220px' }}>
                <Line data={expensesChartData} options={chartDefaults as never} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">🥧 توزيع حالة المشاريع</div>
              </div>
              <div className="chart-container" style={{ height: '220px' }}>
                <Doughnut
                  data={projectStatusData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', font: { family: 'Cairo', size: 11 } },
                      },
                    },
                    cutout: '65%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="dashboard-grid-1-1" style={{ marginBottom: '1.25rem' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">📊 تقدم المشاريع: فعلي vs مخطط</div>
              </div>
              <div className="chart-container" style={{ height: '220px' }}>
                <Bar data={progressChartData} options={chartDefaults as never} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">👷 تكلفة العمالة بالمشروع</div>
              </div>
              <div className="chart-container" style={{ height: '220px' }}>
                <Bar data={laborChartData} options={chartDefaults as never} />
              </div>
            </div>
          </div>

          {/* Recent Projects & Fault Tickets */}
          <div className="dashboard-grid-1-1">
            {/* Recent Projects */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">🏗️ أحدث المشاريع</div>
                <a href="/projects" className="btn btn-outline btn-sm">عرض الكل</a>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>المشروع</th>
                      <th>الإنجاز</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentProjects.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا توجد مشاريع</td></tr>
                    ) : data?.recentProjects.map(project => (
                      <tr key={project.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            <a href={`/projects/${project.id}`} style={{ textDecoration: 'none', color: 'var(--brand-primary-light)' }} title="عرض الملف الفني للمشروع">
                              {project.name?.substring(0, 30)}{project.name?.length > 30 ? '...' : ''}
                            </a>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{project.code}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="progress-bar" style={{ width: '80px', height: '6px' }}>
                              <div
                                className={`progress-fill ${Number(project.avg_progress) < 30 ? 'danger' : Number(project.avg_progress) < 70 ? 'warning' : 'success'}`}
                                style={{ width: `${Math.min(Number(project.avg_progress), 100)}%` }}
                              />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {Number(project.avg_progress).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${statusBadge[project.status] || 'badge-muted'}`}>
                            {statusLabels[project.status] || project.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Fault Tickets */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">🚨 أحدث بلاغات الأعطال</div>
                <a href="/maintenance" className="btn btn-outline btn-sm">عرض الكل</a>
              </div>
              {data?.recentTickets.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">✅</div>
                  <div className="empty-state-title">لا توجد بلاغات مفتوحة</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {data?.recentTickets.map(ticket => (
                    <div key={ticket.id} style={{
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start',
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      <span className={`badge ${urgencyBadge[ticket.urgency] || 'badge-muted'}`} style={{ flexShrink: 0, marginTop: '2px' }}>
                        {urgencyLabels[ticket.urgency] || ticket.urgency}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          {ticket.client_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {ticket.fault_description?.substring(0, 50)}...
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {ticketStatusLabels[ticket.status] || ticket.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
