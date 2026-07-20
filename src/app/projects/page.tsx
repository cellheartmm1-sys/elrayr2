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

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state"><div className="loading-spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏗️</div>
            <div className="empty-state-title">لا توجد مشاريع مسجلة حالياً</div>
            <button className="btn btn-primary" onClick={handleOpenCreate}>إضافة أول مشروع</button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table projects-table">
              <thead>
                <tr>
                  <th style={{ width: '7%' }}>الكود</th>
                  <th style={{ width: '22%' }}>المشروع والعميل</th>
                  <th style={{ width: '9%' }}>الموقع</th>
                  <th style={{ width: '13%' }}>قيمة العقد</th>
                  <th style={{ width: '13%' }}>الإنجاز</th>
                  <th style={{ width: '11%', textAlign: 'center' }}>الحالة</th>
                  <th style={{ width: '9%' }}>الانتهاء</th>
                  <th style={{ width: '16%', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const progress = Math.min(Number(project.actual_progress || 0), 100);
                  const progressColor = progress > 80 ? 'var(--status-success)' : progress > 40 ? 'var(--status-warning)' : 'var(--status-danger)';
                  const progressHex  = progress > 80 ? '#10b981' : progress > 40 ? '#c59b27' : '#ef4444';
                  const statusCfg: Record<string, { cls: string; label: string }> = {
                    active:    { cls: 'badge-success', label: '🟢 نشط'    },
                    completed: { cls: 'badge-primary', label: '🔵 مكتمل'  },
                    suspended: { cls: 'badge-warning', label: '🟡 متوقف'  },
                    tender:    { cls: 'badge-purple',  label: '🟣 مناقصة' },
                  };
                  const sc = statusCfg[project.status] || statusCfg.active;
                  return (
                    <tr key={project.id} className="project-row">
                      {/* الكود */}
                      <td>
                        <a href={`/projects/${project.id}`} className={`badge ${sc.cls}`} style={{ textDecoration: 'none', fontSize: '0.72rem', fontWeight: 800 }}>
                          {project.code}
                        </a>
                      </td>

                      {/* المشروع + العميل */}
                      <td>
                        <a href={`/projects/${project.id}`} style={{ textDecoration: 'none', display: 'block', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.name}
                        </a>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', marginTop: '2px' }}>
                          👤 {project.client_name}
                        </span>
                      </td>

                      {/* الموقع */}
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {project.location || '—'}
                        </span>
                      </td>

                      {/* قيمة العقد */}
                      <td>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {formatCurrency(project.contract_value)}
                        </span>
                      </td>

                      {/* الإنجاز */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div className="progress-bar" style={{ flex: 1, height: '6px', minWidth: 0 }}>
                            <div
                              className={`progress-fill ${progress > 80 ? 'success' : progress > 40 ? 'warning' : 'danger'}`}
                              style={{ width: `${progress}%`, boxShadow: `0 0 6px ${progressHex}66` }}
                            />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: progressColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      {/* الحالة */}
                      <td style={{ textAlign: 'center' }}>
                        <select
                          className={`badge ${sc.cls}`}
                          value={project.status}
                          onChange={(e) => handleQuickStatusChange(project, e.target.value)}
                          style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', border: 'none', outline: 'none', appearance: 'none', textAlign: 'center', padding: '0.3rem 0.5rem', borderRadius: '100px', width: '100%' }}
                          title="تغيير الحالة"
                        >
                          <option value="active">🟢 نشط</option>
                          <option value="completed">🔵 مكتمل</option>
                          <option value="suspended">🟡 متوقف</option>
                          <option value="tender">🟣 مناقصة</option>
                        </select>
                      </td>

                      {/* الانتهاء */}
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {project.end_date ? new Date(project.end_date).toLocaleDateString('ar-EG') : '—'}
                        </span>
                      </td>

                      {/* الإجراءات */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', alignItems: 'center' }}>
                          <Link
                            href={`/projects/${project.id}`}
                            className="btn btn-primary btn-sm"
                            title="عرض المشروع"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                          >
                            👁️ عرض
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(project)}
                            className="btn btn-ghost btn-sm"
                            title="تعديل"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.72rem' }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="btn btn-ghost btn-sm text-danger"
                            title="حذف"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.72rem' }}
                          >
                            🗑️
                          </button>
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
