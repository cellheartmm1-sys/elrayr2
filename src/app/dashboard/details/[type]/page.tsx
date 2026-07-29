'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

interface PageParams {
  type: string;
}

interface DetailPageProps {
  params: Promise<PageParams>;
}

function formatDynamic(val: any) {
  let symbol = 'ج.م';
  if (typeof window !== 'undefined') {
    symbol = localStorage.getItem('system_currency_symbol') || 'ج.م';
  }
  return Number(val).toLocaleString('ar-EG') + ' ' + symbol;
}

// Configuration map for each metric details page
const METRIC_CONFIGS: Record<string, {
  title: string;
  subtitle: string;
  icon: string;
  headers: string[];
  fields: string[];
  formatters?: Record<string, (val: any) => React.ReactNode>;
}> = {
  projects: {
    title: 'تفاصيل المشاريع النشطة',
    subtitle: 'قائمة شاملة بجميع المشاريع ذات الحالة النشطة وتواريخ بدئها وقيمها التعاقدية',
    icon: '🏗️',
    headers: ['اسم المشروع', 'كود المشروع', 'العميل', 'تاريخ البدء', 'تاريخ الانتهاء', 'قيمة العقد'],
    fields: ['name', 'code', 'client_name', 'start_date', 'end_date', 'contract_value'],
    formatters: {
      start_date: (val) => val ? new Date(val).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-',
      end_date: (val) => val ? new Date(val).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-',
      contract_value: formatDynamic
    }
  },
  contracts: {
    title: 'تفاصيل قيمة العقود للمشاريع',
    subtitle: 'سجل كامل بجميع مشاريع الشركة مرتبة تنازلياً حسب القيمة التعاقدية وحالة كل مشروع',
    icon: '💰',
    headers: ['اسم المشروع', 'كود المشروع', 'العميل', 'قيمة العقد', 'الحالة'],
    fields: ['name', 'code', 'client_name', 'contract_value', 'status'],
    formatters: {
      contract_value: formatDynamic,
      status: (val) => {
        const labels: Record<string, string> = { active: 'نشط', completed: 'مكتمل', suspended: 'متوقف', tender: 'مناقصة' };
        const badges: Record<string, string> = { active: 'badge-success', completed: 'badge-primary', suspended: 'badge-warning', tender: 'badge-purple' };
        return <span className={`badge ${badges[val] || 'badge-muted'}`}>{labels[val] || val}</span>;
      }
    }
  },
  employees: {
    title: 'تفاصيل الموظفين النشطين',
    subtitle: 'قائمة شاملة بالموظفين والعمالة المسجلين حالياً على رأس العمل في الشركة',
    icon: '👷',
    headers: ['الرقم الوظيفي', 'الاسم الكامل', 'المسمى الوظيفي', 'الجنسية', 'رقم الهاتف'],
    fields: ['employee_number', 'full_name', 'job_title', 'nationality', 'phone'],
  },
  tickets: {
    title: 'تفاصيل بلاغات الأعطال المفتوحة',
    subtitle: 'كافة بلاغات الأعطال وبلاغات الصيانة التي لم يتم حلها بعد وتصنيف أهميتها',
    icon: '🔧',
    headers: ['رقم البلاغ', 'العميل', 'وصف العطل', 'درجة الأهمية', 'حالة البلاغ'],
    fields: ['ticket_number', 'client_name', 'fault_description', 'urgency', 'status'],
    formatters: {
      urgency: (val) => {
        const labels: Record<string, string> = { emergency: 'طارئ', urgent: 'عاجل', normal: 'عادي' };
        const badges: Record<string, string> = { emergency: 'badge-danger', urgent: 'badge-warning', normal: 'badge-primary' };
        return <span className={`badge ${badges[val] || 'badge-muted'}`}>{labels[val] || val}</span>;
      },
      status: (val) => {
        const labels: Record<string, string> = { open: 'مفتوح', assigned: 'مُسنَد', in_progress: 'جاري', resolved: 'تم الحل', closed: 'مغلق' };
        const badges: Record<string, string> = { open: 'badge-danger', assigned: 'badge-warning', in_progress: 'badge-primary', resolved: 'badge-success', closed: 'badge-muted' };
        return <span className={`badge ${badges[val] || 'badge-muted'}`}>{labels[val] || val}</span>;
      }
    }
  },
  documents: {
    title: 'تفاصيل الوثائق التي تنتهي قريباً',
    subtitle: 'الوثائق والمستندات الرسمية للموظفين التي تنتهي خلال 30 يوم وتحتاج تجديد عاجل',
    icon: '📄',
    headers: ['اسم الموظف', 'الرقم الوظيفي', 'نوع الوثيقة', 'رقم الوثيقة', 'تاريخ الانتهاء', 'الأيام المتبقية'],
    fields: ['full_name', 'employee_number', 'document_type', 'document_number', 'expiry_date', 'days_remaining'],
    formatters: {
      expiry_date: (val) => val ? new Date(val).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-',
      days_remaining: (val) => {
        const days = parseInt(val, 10);
        return <span className={`badge ${days <= 10 ? 'badge-danger' : 'badge-warning'}`}>{days} يوم متبقي</span>;
      },
      document_type: (val) => {
        const docLabels: Record<string, string> = {
          iqama: 'إقامة', passport: 'جواز سفر', osha: 'شهادة أوشا (OSHA)', driving_license: 'رخصة قيادة',
          vehicle_license: 'رخصة معدة/سيارة', health_card: 'بطاقة صحية', contract: 'عقد العمل'
        };
        return docLabels[val] || val;
      }
    }
  },
  overtime: {
    title: 'تفاصيل طلبات العمل الإضافي المعلقة',
    subtitle: 'طلبات الاعتماد المالي لساعات العمل الإضافية المرفوعة وبانتظار الموافقة والاعتماد',
    icon: '⏰',
    headers: ['اسم الموظف', 'المشروع المرتبط', 'تاريخ العمل الإضافي', 'الساعات المطلوبة', 'السبب'],
    fields: ['employee_name', 'project_name', 'overtime_date', 'hours_requested', 'reason'],
    formatters: {
      overtime_date: (val) => val ? new Date(val).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-',
      hours_requested: (val) => `${val} ساعة`
    }
  },
  maintenance: {
    title: 'تفاصيل عقود الصيانة النشطة',
    subtitle: 'عقود الصيانة الدورية والتشغيلية النشطة حالياً مع العملاء والمؤسسات المختلفة',
    icon: '🔐',
    headers: ['رقم العقد', 'اسم العميل', 'قيمة العقد', 'تاريخ البدء', 'تاريخ الانتهاء'],
    fields: ['contract_number', 'client_name', 'contract_value', 'start_date', 'end_date'],
    formatters: {
      contract_value: formatDynamic,
      start_date: (val) => val ? new Date(val).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-',
      end_date: (val) => val ? new Date(val).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-'
    }
  },
  expenses: {
    title: 'تفاصيل المصروفات الشهرية',
    subtitle: 'كافة المصروفات النثرية وفواتير المشتريات التي تم قيدها على المشاريع خلال الشهر الحالي',
    icon: '📊',
    headers: ['التاريخ', 'اسم البند / الوصف', 'المبلغ', 'المشروع المرتبط'],
    fields: ['expense_date', 'item_name', 'amount', 'project_name'],
    formatters: {
      expense_date: (val) => val ? new Date(val).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-',
      amount: formatDynamic,
      project_name: (val) => val || 'مصاريف عمومية وإدارية'
    }
  }
};

export default function MetricDetailPage({ params }: DetailPageProps) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const type = unwrappedParams.type;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = METRIC_CONFIGS[type];

  useEffect(() => {
    if (!config) {
      setError('نوع التفاصيل المحدد غير صحيح.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/dashboard/details?type=${type}`);
        if (!res.ok) throw new Error('فشل تحميل بيانات التفاصيل من السيرفر');
        const rows = await res.json();
        setData(Array.isArray(rows) ? rows : []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, config]);

  if (!config) {
    return (
      <AppLayout title="خطأ في الصفحة" icon="⚠️">
        <div className="card text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--status-danger)', marginBottom: '1rem' }}>
            {error || 'عذراً، نوع تفاصيل لوحة التحكم المحدد غير متوفر.'}
          </div>
          <button onClick={() => router.push('/dashboard')} className="btn btn-primary">
            العودة للوحة التحكم الرئيسية
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={config.title} subtitle={config.subtitle} icon={config.icon}>
      {/* Page Header Actions */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <div className="page-title">
            <span>{config.icon}</span> {config.title}
          </div>
          <div className="page-description">{config.subtitle}</div>
        </div>
        <div className="page-header-actions">
          <button onClick={() => router.push('/dashboard')} className="btn btn-outline">
            ← العودة للوحة التحكم
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="card">
        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner" />
            <div style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>جاري تحميل البيانات التفصيلية...</div>
          </div>
        ) : error ? (
          <div className="empty-state text-danger">
            <div style={{ fontSize: '2rem' }}>❌</div>
            <div className="empty-state-title">فشل تحميل البيانات</div>
            <div className="empty-state-description">{error}</div>
          </div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{config.icon}</div>
            <div className="empty-state-title">لا توجد بيانات مسجلة حالياً</div>
            <div className="empty-state-description">لم يتم العثور على أي سجلات مطابقة لهذا التصنيف في قاعدة البيانات.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {config.headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {config.fields.map((field, colIdx) => {
                      const val = row[field];
                      const formatter = config.formatters?.[field];
                      return (
                        <td key={colIdx} style={{ fontWeight: colIdx === 0 ? 600 : 400, color: colIdx === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {formatter ? formatter(val) : (val === null || val === undefined ? '-' : String(val))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
