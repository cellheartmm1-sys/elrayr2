'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

interface Project {
  id: string;
  name: string;
  code: string;
  client_name: string;
  client_contact?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  contract_value: string;
  status: string;
  description?: string;
  actual_progress: string;
  planned_progress: string;
  total_expenses: string;
  phases_count: number;
}

const statusLabels: Record<string, string> = {
  active: 'نشط',
  completed: 'مكتمل',
  suspended: 'متوقف',
  tender: 'مناقصة'
};

const statusBadge: Record<string, string> = {
  active: 'badge-success',
  completed: 'badge-primary',
  suspended: 'badge-warning',
  tender: 'badge-purple'
};

export default function ProjectsPage() {
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrencySymbol(localStorage.getItem('system_currency_symbol') || 'ج.م');
    }
  }, []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ key: string; name: string }>>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/employees/upload', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          setUploadedFiles(prev => [...prev, { key: data.key, name: data.filename }]);
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

  const handleRemoveUploadedFile = (keyToRemove: string) => {
    setUploadedFiles(prev => prev.filter(f => f.key !== keyToRemove));
  };

  // Form State
  const [form, setForm] = useState({
    name: '',
    code: '',
    client_name: '',
    client_contact: '',
    location: '',
    start_date: '',
    end_date: '',
    contract_value: '',
    status: 'active',
    description: '',
    payment_type: 'once'
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleOpenCreate = () => {
    setEditingProject(null);
    setForm({
      name: '',
      code: '',
      client_name: '',
      client_contact: '',
      location: '',
      start_date: '',
      end_date: '',
      contract_value: '',
      status: 'active',
      description: '',
      payment_type: 'once'
    });
    setUploadedFiles([]);
    setShowModal(true);
  };

  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      name: project.name || '',
      code: project.code || '',
      client_name: project.client_name || '',
      client_contact: project.client_contact || '',
      location: project.location || '',
      start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
      end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '',
      contract_value: project.contract_value || '',
      status: project.status || 'active',
      description: project.description || '',
      payment_type: (project as any).payment_type || 'once'
    });
    setUploadedFiles([]);
    setShowModal(true);
  };

  const handleQuickStatusChange = async (project: Project, newStatus: string) => {
    try {
      const userRole = localStorage.getItem('user_role') || 'admin';
      const userName = localStorage.getItem('user_name') || 'مستخدم النظام';

      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
          'x-user-name': encodeURIComponent(userName)
        },
        body: JSON.stringify({
          ...project,
          status: newStatus
        })
      });

      if (res.ok) {
        alert('✅ تم تحديث حالة المشروع بنجاح!');
        fetchProjects();
      } else {
        const data = await res.json();
        alert(`❌ فشل تغيير الحالة: ${data.error || 'حدث خطأ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ أثناء تغيير حالة المشروع.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userRole = localStorage.getItem('user_role') || 'admin';
      const userName = localStorage.getItem('user_name') || 'مستخدم النظام';

      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
      const method = editingProject ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
          'x-user-name': encodeURIComponent(userName)
        },
        body: JSON.stringify({
          ...form,
          contract_value: Number(form.contract_value) || 0,
          uploaded_files: uploadedFiles
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setUploadedFiles([]);
        if (data.pending_approval) {
          alert(`⏳ ${data.message}`);
        } else {
          alert(editingProject ? '✅ تم تعديل بيانات المشروع بنجاح!' : '✅ تم إضافة المشروع بنجاح!');
        }
        fetchProjects();
      } else {
        alert(`❌ حدث خطأ أثناء الحفظ: ${data.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المشروع؟ ستقوم العملية بحذف كافة بياناته المرتبطة.')) return;
    try {
      const userRole = localStorage.getItem('user_role') || 'admin';
      const userName = localStorage.getItem('user_name') || 'مستخدم النظام';

      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': userRole,
          'x-user-name': encodeURIComponent(userName)
        }
      });
      const data = await res.json();
      if (res.ok) {
        if (data.pending_approval) {
          alert(`⏳ ${data.message}`);
        } else {
          alert('✅ تم حذف المشروع بنجاح!');
        }
        fetchProjects();
      } else {
        alert(`❌ فشل الحذف: ${data.error || 'حدث خطأ أثناء التنفيذ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  // KPI calculations
  const totalContractVal = projects.reduce((acc, p) => acc + Number(p.contract_value || 0), 0);
  const activeCount = projects.filter(p => p.status === 'active').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;

  return (
    <AppLayout title="إدارة المشاريع" subtitle="تتبع المواقع ونسب الإنجاز الفعلي بالمخطط له" icon="🏗️">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">🏗️ قائمة المشاريع والمواقع</div>
          <div className="page-description">متابعة نسب إنجاز الأعمال والشبكات والصواعد والتركيبات وتغيير الحالات وتحديث البيانات</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            + إضافة مشروع جديد
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon">📁</div>
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">إجمالي المشاريع</div>
        </div>
        <div className="stat-card success">
          <div className="stat-card-icon">🟢</div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">مشاريع نشطة حالياً</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-card-icon">🔵</div>
          <div className="stat-value">{completedCount}</div>
          <div className="stat-label">مشاريع مكتملة</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-card-icon">💰</div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totalContractVal)}</div>
          <div className="stat-label">إجمالي قيمة المحفظة</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrapper" style={{ maxWidth: '300px' }}>
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="بحث باسم المشروع، الكود، العميل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="completed">مكتمل</option>
          <option value="suspended">متوقف</option>
          <option value="tender">مناقصة</option>
        </select>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-normal)', margin: '1.5rem 0 1.75rem 0', opacity: 0.6 }} />

      {/* Data Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div className="empty-state"><div className="loading-spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏗️</div>
            <div className="empty-state-title">لا توجد مشاريع مسجلة حالياً</div>
            <button className="btn btn-primary" onClick={handleOpenCreate}>إضافة أول مشروع</button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1rem',
          }}>
            {projects.map((project) => {
              const progress = Math.min(Number(project.actual_progress || 0), 100);
              const progressColor = progress > 80 ? '#10b981' : progress > 40 ? '#f59e0b' : '#ef4444';
              const statusColors: Record<string, { bg: string; color: string; border: string }> = {
                active:    { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', border: 'rgba(16,185,129,0.3)'  },
                completed: { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
                suspended: { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.3)'  },
                tender:    { bg: 'rgba(139,92,246,0.12)',  color: '#a78bfa', border: 'rgba(139,92,246,0.3)'  },
              };
              const sc = statusColors[project.status] || statusColors.active;
              return (
                <div
                  key={project.id}
                  style={{
                    background: 'linear-gradient(145deg, var(--bg-card), rgba(15,20,35,0.9))',
                    border: `1px solid ${sc.border}`,
                    borderRadius: '14px',
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: `0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px ${sc.border}`,
                    animation: 'fadeInUp 0.4s ease-out both',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 35px rgba(0,0,0,0.35), 0 0 0 1px ${sc.border}`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px ${sc.border}`; }}
                >
                  {/* Header Row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em',
                          color: '#60a5fa', background: 'rgba(59,130,246,0.1)',
                          padding: '0.15rem 0.5rem', borderRadius: '100px',
                          border: '1px solid rgba(59,130,246,0.2)', whiteSpace: 'nowrap'
                        }}>
                          {project.code}
                        </span>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700,
                          color: sc.color, background: sc.bg,
                          padding: '0.15rem 0.5rem', borderRadius: '100px',
                          border: `1px solid ${sc.border}`, whiteSpace: 'nowrap'
                        }}>
                          {project.status === 'active' ? '🟢' : project.status === 'completed' ? '🔵' : project.status === 'suspended' ? '🟡' : '🟣'} {statusLabels[project.status]}
                        </span>
                      </div>
                      <a
                        href={`/projects/${project.id}`}
                        style={{
                          fontSize: '1rem', fontWeight: 700, color: '#fff',
                          textDecoration: 'none', display: 'block', lineHeight: 1.3,
                        }}
                      >
                        {project.name}
                      </a>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 0.75rem',
                    fontSize: '0.78rem',
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.5)' }}>👤 العميل</div>
                    <div style={{ color: '#e2e8f0', fontWeight: 600, textAlign: 'left' }}>{project.client_name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)' }}>📍 الموقع</div>
                    <div style={{ color: '#e2e8f0', textAlign: 'left' }}>{project.location || '—'}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)' }}>💰 قيمة العقد</div>
                    <div style={{ color: '#fbbf24', fontWeight: 700, textAlign: 'left' }}>{formatCurrency(project.contract_value)}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)' }}>📅 الانتهاء</div>
                    <div style={{ color: '#e2e8f0', textAlign: 'left' }}>
                      {project.end_date ? new Date(project.end_date).toLocaleDateString('ar-EG') : '—'}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>نسبة الإنجاز</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: progressColor }}>{progress.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${progress}%`,
                        background: `linear-gradient(90deg, ${progressColor}, ${progressColor}88)`,
                        borderRadius: '100px',
                        transition: 'width 0.6s ease',
                        boxShadow: `0 0 8px ${progressColor}66`
                      }} />
                    </div>
                  </div>

                  {/* Action Buttons + Status Changer */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                    <Link
                      href={`/projects/${project.id}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        color: '#fff', textDecoration: 'none',
                        boxShadow: '0 3px 10px rgba(59,130,246,0.35)',
                        transition: 'all 0.2s ease',
                        flex: 1, justifyContent: 'center',
                      }}
                    >
                      👁️ عرض
                    </Link>
                    <button
                      onClick={() => handleOpenEdit(project)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                        background: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
                        border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flex: 1,
                      }}
                    >
                      ✏️ تعديل
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                        background: 'rgba(239,68,68,0.1)', color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      🗑️
                    </button>
                    <select
                      value={project.status}
                      onChange={(e) => handleQuickStatusChange(project, e.target.value)}
                      style={{
                        padding: '0.4rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
                        background: sc.bg, color: sc.color,
                        border: `1px solid ${sc.border}`, cursor: 'pointer',
                        outline: 'none', appearance: 'none', textAlign: 'center',
                      }}
                      title="تغيير حالة المشروع"
                    >
                      <option value="active">🟢 نشط</option>
                      <option value="completed">🔵 مكتمل</option>
                      <option value="suspended">🟡 متوقف</option>
                      <option value="tender">🟣 مناقصة</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Add / Edit Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingProject ? '✏️ تعديل بيانات المشروع' : '🏗️ إضافة مشروع جديد'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label required">اسم المشروع</label>
                  <input
                    className="form-control"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="مشروع برج الحريق..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">كود المشروع</label>
                  <input
                    className="form-control"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="PRJ-2026-X"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">اسم العميل</label>
                  <input
                    className="form-control"
                    required
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    placeholder="شركة التطوير..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الاتصال بالعميل</label>
                  <input
                    className="form-control"
                    value={form.client_contact}
                    onChange={(e) => setForm({ ...form, client_contact: e.target.value })}
                    placeholder="جوال أو إيميل المسؤول..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الموقع الجغرافي (الإمارة)</label>
                  <select
                    className="form-control"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  >
                    <option value="">اختر الإمارة (الإمارات العربية المتحدة)...</option>
                    {['أبوظبي', 'دبي', 'الشارقة', 'عجمان', 'أم القيوين', 'رأس الخيمة', 'الفجيرة'].map(em => (
                      <option key={em} value={em}>{em}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">قيمة العقد ({currencySymbol})</label>
                  <input
                    className="form-control"
                    type="number"
                    value={form.contract_value}
                    onChange={(e) => setForm({ ...form, contract_value: e.target.value })}
                    placeholder="500000"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">طريقة استلام قيمة التعاقد</label>
                  <select
                    className="form-control"
                    value={form.payment_type}
                    onChange={(e) => setForm({ ...form, payment_type: e.target.value })}
                  >
                    <option value="once">مرة واحدة / دفعة واحدة</option>
                    <option value="installments">على دفعات</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ البدء</label>
                  <input
                    className="form-control"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الانتهاء المتوقع</label>
                  <input
                    className="form-control"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">حالة المشروع</label>
                  <select
                    className="form-control"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">نشط</option>
                    <option value="completed">مكتمل</option>
                    <option value="suspended">متوقف</option>
                    <option value="tender">مناقصة</option>
                  </select>
                </div>
                <div className="form-group col-span-3">
                  <label className="form-label">الوصف / نطاق العمل</label>
                  <textarea
                    className="form-control"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="تركيب شبكات حريق، مضخات، رشاشات..."
                    rows={2}
                  />
                </div>
                <div className="form-group col-span-3" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: 'var(--brand-primary-light)' }}>📁 الملفات المرفقة للمشروع (مخططات، عقود، صور)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*,.pdf,.xls,.xlsx" 
                      onChange={handleFileUpload} 
                      disabled={uploading}
                      style={{ display: 'none' }}
                      id="project-file-upload-input"
                    />
                    <label 
                      htmlFor="project-file-upload-input" 
                      className="btn btn-outline" 
                      style={{ cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {uploading ? (
                        <>
                          <span className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                          جاري الرفع...
                        </>
                      ) : '➕ اختر ملفات للرفع'}
                    </label>
                  </div>
                  
                  {uploadedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      {uploadedFiles.map((file) => (
                        <div key={file.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-primary)' }}>📎 {file.name}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveUploadedFile(file.key)}
                            style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontWeight: 700 }}
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">{editingProject ? '💾 حفظ التعديلات' : '💾 حفظ المشروع'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
