'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';
import Link from 'next/link';

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  full_name_en?: string;
  nationality?: string;
  id_number?: string;
  iqama_number?: string;
  iqama_expiry?: string;
  passport_number?: string;
  passport_expiry?: string;
  date_of_birth?: string;
  hire_date?: string;
  job_title: string;
  department_name?: string;
  employment_type: string;
  base_salary: string;
  housing_allowance?: string;
  transport_allowance?: string;
  other_allowances?: string;
  bank_account?: string;
  bank_name?: string;
  iban?: string;
  phone?: string;
  email?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  status: string;
  notes?: string;
}

interface Document {
  id: string;
  document_type: string;
  document_number?: string;
  file_url?: string;
  notes?: string;
  created_at: string;
}

interface Asset {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  condition: string;
  status: string;
}

interface Attendance {
  id: string;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  attendance_type: string;
  overtime_hours?: string;
}

interface Allocation {
  id: string;
  project_name: string;
  month: number;
  year: number;
  allocation_percentage: string;
  allocated_amount: string;
}

const statusLabels: Record<string, string> = {
  active: 'نشط',
  inactive: 'غير نشط',
  on_leave: 'في إجازة',
  terminated: 'مستقيل/مفصول'
};

const statusBadge: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge-muted',
  on_leave: 'badge-warning',
  terminated: 'badge-danger'
};

const typeLabels: Record<string, string> = {
  full_time: 'دوام كامل',
  part_time: 'دوام جزئي',
  contract: 'عقد مؤقت',
  daily: 'يومية'
};

const typeBadge: Record<string, string> = {
  full_time: 'badge-primary',
  part_time: 'badge-purple',
  contract: 'badge-warning',
  daily: 'badge-success'
};

const docLabels: Record<string, string> = {
  iqama: 'إقامة',
  passport: 'جواز سفر',
  osha: 'شهادة أوشا (OSHA)',
  driving_license: 'رخصة قيادة',
  vehicle_license: 'رخصة معدة',
  health_card: 'بطاقة صحية',
  contract: 'عقد العمل',
  other: 'مرفق عام'
};

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'docs' | 'assets' | 'logs'>('profile');

  // File upload state for adding new files to existing employee
  const [uploading, setUploading] = useState(false);

  // Salary allocation CRUD states
  const [projects, setProjects] = useState<any[]>([]);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<any | null>(null);
  const [allocationForm, setAllocationForm] = useState({
    project_id: '',
    allocation_percentage: '10',
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    notes: ''
  });

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : (data?.data ?? []));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/employees/${id}`);
      if (!res.ok) throw new Error('Failed to fetch employee details');
      const data = await res.json();
      setEmployee(data.employee);
      setDocuments(data.documents || []);
      setAssets(data.assets || []);
      setAttendance(data.attendance || []);
      setAllocations(data.allocations || []);
    } catch (err) {
      console.error(err);
      alert('خطأ أثناء تحميل بيانات الموظف.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    fetchProjects();
  }, [id]);

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/hr/allocations';
      const method = editingAllocation ? 'PUT' : 'POST';
      const body = {
        id: editingAllocation?.id,
        employee_id: id,
        project_id: allocationForm.project_id,
        allocation_percentage: Number(allocationForm.allocation_percentage),
        month: Number(allocationForm.month),
        year: Number(allocationForm.year),
        notes: allocationForm.notes
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowAllocationModal(false);
        setAllocationForm({
          project_id: '',
          allocation_percentage: '10',
          month: String(new Date().getMonth() + 1),
          year: String(new Date().getFullYear()),
          notes: ''
        });
        setEditingAllocation(null);
        fetchDetails();
      } else {
        const err = await res.json();
        alert(`❌ فشل حفظ توزيع الراتب: ${err.error || 'خطأ غير معروف'}`);
      }
    } catch (err: any) {
      alert(`❌ خطأ في الاتصال بالخادم: ${err.message}`);
    }
  };

  const handleDeleteAllocation = async (allocId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا التوزيع نهائياً؟')) return;
    try {
      const res = await fetch(`/api/hr/allocations?id=${allocId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDetails();
      } else {
        alert('❌ فشل حذف التوزيع.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateAllocation = () => {
    setEditingAllocation(null);
    setAllocationForm({
      project_id: '',
      allocation_percentage: '10',
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
      notes: ''
    });
    setShowAllocationModal(true);
  };

  const handleOpenEditAllocation = (al: any) => {
    setEditingAllocation(al);
    setAllocationForm({
      project_id: al.project_id || '',
      allocation_percentage: String(al.allocation_percentage || '10'),
      month: String(al.month || new Date().getMonth() + 1),
      year: String(al.year || new Date().getFullYear()),
      notes: al.notes || ''
    });
    setShowAllocationModal(true);
  };


  // Wait! Let's implement document upload directly to the database for this employee
  const uploadAndAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          // Save to employee_documents via a simple API call
          const saveRes = await fetch('/api/hr/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employee_id: id,
              document_type: 'other',
              document_number: file.name,
              file_url: uploadData.key,
              notes: 'ملف مرفوع من الصفحة التفصيلية للموظف'
            })
          });

          if (saveRes.ok) {
            fetchDetails();
          } else {
            alert('فشل حفظ تفاصيل الملف في قاعدة البيانات.');
          }
        } else {
          alert(`فشل رفع الملف ${file.name}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء رفع الملفات.');
    } finally {
      setUploading(false);
    }
  };

  const isImage = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif'].includes(ext || '');
  };

  const isPdf = (url: string) => {
    return url.toLowerCase().endsWith('.pdf');
  };

  const isExcel = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    return ['xls', 'xlsx'].includes(ext || '');
  };

  if (loading) {
    return (
      <AppLayout title="الملف الوظيفي" icon="👨‍💼">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div className="loading-spinner" />
        </div>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout title="الموظف غير موجود" icon="⚠️">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>عذراً، لم يتم العثور على الموظف المطلوب.</h3>
          <Link href="/hr" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>العودة للموارد البشرية</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`الملف الوظيفي: ${employee.full_name}`} subtitle={`الرقم الوظيفي: ${employee.employee_number}`} icon="👨‍💼">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Top Summary Card */}
        <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', border: '1px solid var(--border-normal)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a17e1b 0%, #e5b83b 100%)',
                color: '#030406',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800
              }}>
                {employee.full_name.split(' ').map(n => n[0]).join('.').substring(0, 3)}
              </div>
              <div>
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800 }}>{employee.full_name}</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <span>{employee.job_title}</span>
                  <span style={{ margin: '0 0.5rem' }}>•</span>
                  <span>{employee.department_name || 'إدارة غير محددة'}</span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span className={`badge ${statusBadge[employee.status] || 'badge-muted'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: 700 }}>
                {statusLabels[employee.status] || employee.status}
              </span>
              <span className={`badge ${typeBadge[employee.employment_type] || 'badge-muted'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: 700 }}>
                {typeLabels[employee.employment_type] || employee.employment_type}
              </span>
              <button onClick={() => window.print()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                🖨️ طباعة الملف الكامل
              </button>
              <Link href="/hr" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                🔙 رجوع
              </Link>
            </div>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="tabs" style={{ background: 'rgba(255,255,255,0.01)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'inline-flex', width: 'auto', gap: '0.25rem' }}>
          <button className={`tab-btn ${activeSubTab === 'profile' ? 'active' : ''}`} style={{ borderRadius: '8px', padding: '0.5rem 1.25rem' }} onClick={() => setActiveSubTab('profile')}>📋 البيانات الأساسية</button>
          <button className={`tab-btn ${activeSubTab === 'docs' ? 'active' : ''}`} style={{ borderRadius: '8px', padding: '0.5rem 1.25rem' }} onClick={() => setActiveSubTab('docs')}>📁 المرفقات والوثائق ({documents.length})</button>
          <button className={`tab-btn ${activeSubTab === 'assets' ? 'active' : ''}`} style={{ borderRadius: '8px', padding: '0.5rem 1.25rem' }} onClick={() => setActiveSubTab('assets')}>🔨 العهد والرواتب الموزعة</button>
          <button className={`tab-btn ${activeSubTab === 'logs' ? 'active' : ''}`} style={{ borderRadius: '8px', padding: '0.5rem 1.25rem' }} onClick={() => setActiveSubTab('logs')}>📍 الحضور والانصراف</button>
        </div>

        {/* Profile Details Grid */}
        {activeSubTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            {/* Personal Details Card */}
            <div className="card">
              <div className="card-header"><div className="card-title">👤 البيانات الشخصية للاتصال</div></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الاسم بالكامل (أجنبي)</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.full_name_en || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الجنسية</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.nationality || '-'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>رقم الهوية الوطنية / الإقامة</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.iqama_number || employee.id_number || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تاريخ انتهاء الإقامة</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {employee.iqama_expiry ? new Date(employee.iqama_expiry).toLocaleDateString('ar-SA') : '-'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>رقم الجواز</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.passport_number || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تاريخ ميلاد الموظف</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString('ar-SA') : '-'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الهاتف الجوال</label>
                    <div style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{employee.phone || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>البريد الإلكتروني</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.email || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Details Card */}
            <div className="card">
              <div className="card-header"><div className="card-title">💰 الهيكلة المالية والرواتب</div></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الراتب الأساسي</label>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{formatCurrency(employee.base_salary)}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تاريخ التعيين والالتحاق</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('ar-SA') : '-'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>بدل السكن</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(employee.housing_allowance || 0)}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>بدل النقل</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(employee.transport_allowance || 0)}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>البنك المعتمد للتحويل</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.bank_name || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>رقم الحساب البنكي</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.bank_account || '-'}</div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>رقم الآيبان (IBAN)</label>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFeatureSettings: '"tnum"' }}>{employee.iban || '-'}</div>
                </div>
              </div>
            </div>

            {/* Emergency & Notes */}
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <div className="card-header"><div className="card-title">🚨 حالات الطوارئ وملاحظات إضافية</div></div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>شخص للاتصال في الطوارئ</label>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.emergency_contact || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>هاتف الطوارئ</label>
                    <div style={{ fontWeight: 600, color: 'var(--status-danger)' }}>{employee.emergency_phone || '-'}</div>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ملاحظات الموارد البشرية</label>
                  <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    fontSize: '0.9rem', 
                    background: 'rgba(255,255,255,0.01)', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-subtle)',
                    minHeight: '80px',
                    color: 'var(--text-secondary)'
                  }}>
                    {employee.notes || 'لا توجد ملاحظات إضافية.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab with Previews */}
        {activeSubTab === 'docs' && (
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="card-title">📁 وثائق ومستندات الموظف</div>
                <div className="card-subtitle">الصور والملفات الثبوتية الخاصة بالموظف المرفوعة على Cloudflare R2</div>
              </div>
              <div>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,.pdf,.xls,.xlsx" 
                  onChange={uploadAndAttachFile} 
                  disabled={uploading}
                  style={{ display: 'none' }}
                  id="employee-detail-upload"
                />
                <label 
                  htmlFor="employee-detail-upload" 
                  className="btn btn-primary" 
                  style={{ cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {uploading ? (
                    <>
                      <span className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                      جاري رفع المرفق...
                    </>
                  ) : '➕ رفع ملف جديد للموظف'}
                </label>
              </div>
            </div>

            <div className="card-body">
              {documents.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem' }}>
                  <div className="empty-state-icon">📁</div>
                  <div className="empty-state-title">لا توجد ملفات مرفوعة للموظف حالياً</div>
                  <div className="empty-state-description">استخدم الزر في الأعلى لإرفاق صور شخصية، إقامات، شهادات أو عقود عمل.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                  {documents.map((doc) => {
                    const hasFile = !!doc.file_url;
                    const url = hasFile ? `/api/r2-file?key=${encodeURIComponent(doc.file_url || '')}` : '';

                    return (
                      <div key={doc.id} style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-normal)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '2rem' }}>
                            {isPdf(doc.file_url || '') ? '📕' : isExcel(doc.file_url || '') ? '📗' : isImage(doc.file_url || '') ? '🖼️' : '📎'}
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {docLabels[doc.document_type] || doc.document_type}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.document_number || 'بدون رقم'}
                            </div>
                          </div>
                        </div>

                        {/* File preview container */}
                        {hasFile && (
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
                            {isImage(doc.file_url || '') ? (
                              <img src={url} alt={doc.document_number} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : isPdf(doc.file_url || '') ? (
                              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '2.5rem' }}>📄</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>مستند PDF</span>
                              </div>
                            ) : isExcel(doc.file_url || '') ? (
                              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '2.5rem' }}>📊</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>جدول بيانات Excel</span>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '2rem' }}>📎</span>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>ملف مرفق</div>
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                          {hasFile && (
                            <>
                              <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn btn-outline btn-sm" 
                                style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}
                              >
                                {isImage(doc.file_url || '') || isPdf(doc.file_url || '') ? '👁️ عرض' : '📥 تحميل'}
                              </a>
                              {(isImage(doc.file_url || '') || isPdf(doc.file_url || '')) && (
                                <a 
                                  href={url} 
                                  download
                                  className="btn btn-ghost btn-sm" 
                                  style={{ border: '1px solid var(--border-subtle)', justifyContent: 'center' }}
                                  title="تحميل الملف للكمبيوتر"
                                >
                                  📥
                                </a>
                              )}
                            </>
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

        {/* Assets & Allocations Tab */}
        {activeSubTab === 'assets' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Assets */}
            <div className="card">
              <div className="card-header"><div className="card-title">🔨 العهد الشخصية المستلمة</div></div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>كود العهدة</th>
                      <th>العهد المستلمة</th>
                      <th>النوع</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          لا توجد عهد شخصية مسلمة للموظف.
                        </td>
                      </tr>
                    ) : (
                      assets.map((a) => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 700 }}>{a.asset_code}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.asset_name}</td>
                          <td>{a.asset_type}</td>
                          <td>
                            <span className="badge badge-primary">{a.condition}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Salary allocations */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="card-title">📊 توزيع الراتب والتكلفة على المشاريع</div>
                  <div className="card-subtitle">تحديد نسب تحميل تكلفة الموظف وراتبه على المشاريع المختلفة خلال الشهر والسنة</div>
                </div>
                <button className="btn btn-primary" onClick={handleOpenCreateAllocation}>
                  ➕ إضافة توزيع جديد
                </button>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>المشروع</th>
                      <th>نسبة التحميل</th>
                      <th>مبلغ التكلفة المستقطعة</th>
                      <th>الفترة</th>
                      <th style={{ textAlign: 'center', width: '120px' }}>العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          لا توجد نسب تحميل تكلفة موزعة على المشاريع.
                        </td>
                      </tr>
                    ) : (
                      allocations.map((al) => (
                        <tr key={al.id}>
                          <td style={{ fontWeight: 600, color: 'var(--brand-primary-light)' }}>{al.project_name}</td>
                          <td style={{ fontWeight: 700, color: 'var(--status-success)' }}>{al.allocation_percentage}%</td>
                          <td style={{ fontWeight: 700 }}>{formatCurrency(al.allocated_amount)}</td>
                          <td style={{ fontFeatureSettings: '"tnum"' }}>{al.month} / {al.year}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              <button className="btn btn-outline btn-sm" onClick={() => handleOpenEditAllocation(al)} title="تعديل التوزيع">✏️</button>
                              <button className="btn btn-outline btn-sm text-danger" onClick={() => handleDeleteAllocation(al.id)} title="حذف التوزيع">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Logs */}
        {activeSubTab === 'logs' && (
          <div className="card">
            <div className="card-header"><div className="card-title">📍 سجلات الحضور والانصراف الجغرافية (آخر 30 يوم)</div></div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>وقت الحضور</th>
                    <th>وقت الانصراف</th>
                    <th>نوع التحضير</th>
                    <th>العمل الإضافي</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        لا توجد سجلات حضور مسجلة للموظف مؤخراً.
                      </td>
                    </tr>
                  ) : (
                    attendance.map((a) => (
                      <tr key={a.id}>
                        <td>{new Date(a.attendance_date).toLocaleDateString('ar-SA')}</td>
                        <td style={{ color: 'var(--status-success)', fontFeatureSettings: '"tnum"' }}>
                          {a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td style={{ color: 'var(--status-warning)', fontFeatureSettings: '"tnum"' }}>
                          {a.check_out_time ? new Date(a.check_out_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td>
                          <span className={`badge ${a.attendance_type === 'present' ? 'badge-success' : a.attendance_type === 'late' ? 'badge-warning' : 'badge-danger'}`}>
                            {a.attendance_type === 'present' ? 'حاضر' : a.attendance_type === 'late' ? 'متأخر' : 'غياب'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--status-purple)' }}>{a.overtime_hours || 0} ساعة</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ======================== PRINTABLE EMPLOYEE DOSSIER (A4) ======================== */}
      <div className="employee-print-dossier">
        <style>{`
          @media screen {
            .employee-print-dossier { display: none !important; }
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm 15mm 15mm 15mm;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print, header, nav, sidebar, .app-header, .tabs, button, Link, label, .modal-overlay {
              display: none !important;
            }
            .employee-print-dossier {
              display: block !important;
              width: 100% !important;
              direction: rtl !important;
              color: #1e293b !important;
            }
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 0.4rem;
              margin-bottom: 0.8rem;
            }
            .print-table th, .print-table td {
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
              font-size: 11px;
              text-align: right;
            }
            .print-table th {
              background-color: #f1f5f9 !important;
              font-weight: bold;
            }
          }
        `}</style>

        {/* Header */}
        <div style={{ borderBottom: '2px solid #1e293b', paddingBottom: '0.8rem', marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>شركة الرايق للإنشاءات والمقاولات العامة</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>إدارة الموارد البشرية - بطاقة السجل الوظيفي الشامل</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4f46e5' }}>بطاقة ملف الموظف</div>
            <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>رقم الملف: {employee.employee_number}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
          </div>
        </div>

        {/* Top Info Banner */}
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '1rem', marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{employee.full_name}</div>
            <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>
              المسمى الوظيفي: <strong>{employee.job_title}</strong> | القسم: <strong>{employee.department_name || 'غير محدد'}</strong>
            </div>
          </div>
          <div style={{ textAlign: 'left', fontSize: '0.85rem', color: '#334155' }}>
            <div>حالة التوظيف: <strong>{statusLabels[employee.status] || employee.status}</strong></div>
            <div>نوع العقد: <strong>{typeLabels[employee.employment_type] || employee.employment_type}</strong></div>
          </div>
        </div>

        {/* Section 1: Personal & Financial Details */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>
            📌 البيانات الشخصية والهيكلة المالية
          </div>
          <table className="print-table">
            <tbody>
              <tr>
                <td style={{ width: '18%', fontWeight: 'bold', background: '#f8fafc' }}>الاسم بالعربي:</td>
                <td style={{ width: '32%' }}>{employee.full_name}</td>
                <td style={{ width: '18%', fontWeight: 'bold', background: '#f8fafc' }}>الاسم بالإنجليزية:</td>
                <td style={{ width: '32%' }}>{employee.full_name_en || '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>الجنسية:</td>
                <td>{employee.nationality || '-'}</td>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>رقم الإقامة / الهوية:</td>
                <td>{employee.iqama_number || employee.id_number || '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>تاريخ انتهاء الإقامة:</td>
                <td>{employee.iqama_expiry ? new Date(employee.iqama_expiry).toLocaleDateString('ar-SA') : '-'}</td>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>رقم الجواز:</td>
                <td>{employee.passport_number || '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>تاريخ الميلاد:</td>
                <td>{employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString('ar-SA') : '-'}</td>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>تاريخ التعيين:</td>
                <td>{employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('ar-SA') : '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>رقم الجوال:</td>
                <td>{employee.phone || '-'}</td>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>البريد الإلكتروني:</td>
                <td>{employee.email || '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>الراتب الأساسي:</td>
                <td style={{ fontWeight: 'bold' }}>{formatCurrency(employee.base_salary)}</td>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>بدل السكن والنقل:</td>
                <td>{formatCurrency(Number(employee.housing_allowance || 0) + Number(employee.transport_allowance || 0))}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>البنك المعتمد:</td>
                <td>{employee.bank_name || '-'}</td>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>رقم الحساب / IBAN:</td>
                <td>{employee.iban || employee.bank_account || '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', background: '#f8fafc' }}>طوارئ (اسم وتليفون):</td>
                <td colSpan={3}>{(employee.emergency_contact || '-') + ' (' + (employee.emergency_phone || '-') + ')'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Documents & Attachments List */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>
            📁 المستندات والوثائق المرفوعة للموظف ({documents.length})
          </div>
          {documents.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '0.5rem' }}>لا توجد وثائق مرفوعة للموظف حالياً.</div>
          ) : (
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>#</th>
                  <th>نوع المستند / الوثيقة</th>
                  <th>رقم الوثيقة</th>
                  <th>تاريخ الإدراج</th>
                  <th>حالة المرفق</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => (
                  <tr key={doc.id}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ fontWeight: 'bold' }}>{docLabels[doc.document_type] || doc.document_type}</td>
                    <td>{doc.document_number || '-'}</td>
                    <td>{new Date(doc.created_at).toLocaleDateString('ar-EG')}</td>
                    <td>{doc.file_url ? 'مرفق ومحفوظ بالسحابة ✅' : 'مستند بدون ملف'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 3: Assets & Project Allocations */}
        <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>
              🔨 العهد الشخصية المستلمة ({assets.length})
            </div>
            {assets.length === 0 ? (
              <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '0.5rem' }}>لا توجد عهد عينية مسلمة للموظف.</div>
            ) : (
              <table className="print-table">
                <thead>
                  <tr>
                    <th>كود العهدة</th>
                    <th>العهد المستلمة</th>
                    <th>حالة العهدة</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 'bold' }}>{a.asset_code}</td>
                      <td>{a.asset_name}</td>
                      <td>{a.condition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>
              📊 توزيع التكلفة والراتب على المشاريع ({allocations.length})
            </div>
            {allocations.length === 0 ? (
              <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '0.5rem' }}>لا يوجد توزيع مسجل على المشاريع.</div>
            ) : (
              <table className="print-table">
                <thead>
                  <tr>
                    <th>المشروع</th>
                    <th>النسبة</th>
                    <th>المبلغ المستقطع</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map(al => (
                    <tr key={al.id}>
                      <td style={{ fontWeight: 'bold' }}>{al.project_name}</td>
                      <td>{al.allocation_percentage}%</td>
                      <td>{formatCurrency(al.allocated_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section 4: Signatures */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid #cbd5e1', paddingTop: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center', fontSize: '11px' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '2.5rem' }}>إعداد شؤون الموظفين</div>
              <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '0.4rem' }}>التوقيع: ....................</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '2.5rem' }}>إقرار واستلام الموظف</div>
              <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '0.4rem' }}>التوقيع: ....................</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '2.5rem' }}>المراجعة والتدقيق المالي</div>
              <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '0.4rem' }}>التوقيع: ....................</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '2.5rem' }}>اعتماد المدير العام</div>
              <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '0.4rem' }}>التوقيع: ....................</div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================== MODAL: ADD / EDIT SALARY ALLOCATION ======================== */}
      {showAllocationModal && (
        <div className="modal-overlay" onClick={() => setShowAllocationModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingAllocation ? '📐 تعديل توزيع راتب الموظف' : '➕ إضافة توزيع راتب الموظف على مشروع'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAllocationModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveAllocation}>
              <div className="form-grid form-grid-3">
                <div className="form-group col-span-2">
                  <label className="form-label required">المشروع المستهدف</label>
                  <select 
                    className="form-control" 
                    required 
                    value={allocationForm.project_id} 
                    onChange={e => setAllocationForm({...allocationForm, project_id: e.target.value})}
                  >
                    <option value="">اختر المشروع...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">نسبة التحميل (%)</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    required 
                    min="1" 
                    max="100" 
                    value={allocationForm.allocation_percentage} 
                    onChange={e => setAllocationForm({...allocationForm, allocation_percentage: e.target.value})} 
                    placeholder="50" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">الشهر</label>
                  <select 
                    className="form-control" 
                    required 
                    value={allocationForm.month} 
                    onChange={e => setAllocationForm({...allocationForm, month: e.target.value})}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">السنة</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    required 
                    value={allocationForm.year} 
                    onChange={e => setAllocationForm({...allocationForm, year: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <input 
                    className="form-control" 
                    value={allocationForm.notes} 
                    onChange={e => setAllocationForm({...allocationForm, notes: e.target.value})} 
                    placeholder="ملاحظات اختيارية..." 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAllocationModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">
                  {editingAllocation ? '💾 حفظ التعديلات' : '💾 إضافة التوزيع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
