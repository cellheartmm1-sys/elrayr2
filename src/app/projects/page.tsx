'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

interface Project {
  id: string;
  name: string;
  code: string;
  client_name: string;
  location: string;
  start_date: string;
  end_date: string;
  contract_value: string;
  status: string;
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
    description: ''
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userRole = localStorage.getItem('user_role') || 'admin';
      const userName = localStorage.getItem('user_name') || 'مستخدم النظام';

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
          'x-user-name': encodeURIComponent(userName)
        },
        body: JSON.stringify({
          ...form,
          contract_value: Number(form.contract_value) || 0
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
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
          description: ''
        });
        if (data.pending_approval) {
          alert(`⏳ ${data.message}`);
        } else {
          alert('✅ تم إضافة المشروع بنجاح!');
        }
        fetchProjects();
      } else {
        alert(`❌ حدث خطأ أثناء إضافة المشروع: ${data.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المشروع؟')) return;
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
          <div className="page-description">متابعة نسب إنجاز الأعمال والشبكات والصواعد والتركيبات</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
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

      {/* Data Card */}
      <div className="card">
        {loading ? (
          <div className="empty-state"><div className="loading-spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏗️</div>
            <div className="empty-state-title">لا توجد مشاريع مسجلة حالياً</div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>إضافة أول مشروع</button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>اسم المشروع</th>
                  <th>العميل</th>
                  <th>الموقع</th>
                  <th>قيمة العقد</th>
                  <th>نسبة الإنجاز الفعلي</th>
                  <th>الحالة</th>
                  <th>تاريخ الانتهاء</th>
                  <th style={{ textAlign: 'center' }}>العمليات</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td style={{ fontWeight: 'bold' }}>
                      <a href={`/projects/${project.id}`} style={{ textDecoration: 'none', color: 'var(--text-accent)' }} title="عرض الملف الفني للمشروع">
                        {project.code}
                      </a>
                    </td>
                    <td>
                      <a href={`/projects/${project.id}`} style={{ textDecoration: 'none', color: 'var(--brand-primary-light)', fontWeight: 600 }} title="عرض الملف الفني للمشروع">
                        {project.name}
                      </a>
                    </td>
                    <td>{project.client_name}</td>
                    <td>{project.location || '-'}</td>
                    <td>{formatCurrency(project.contract_value)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="progress-bar" style={{ width: '100px' }}>
                          <div
                            className={`progress-fill ${Number(project.actual_progress) > 80 ? 'success' : Number(project.actual_progress) > 40 ? 'warning' : 'danger'}`}
                            style={{ width: `${Math.min(Number(project.actual_progress), 100)}%` }}
                          />
                        </div>
                        <span>{Number(project.actual_progress).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${statusBadge[project.status] || 'badge-muted'}`}>
                        {statusLabels[project.status] || project.status}
                      </span>
                    </td>
                    <td>{project.end_date ? new Date(project.end_date).toLocaleDateString('ar-SA') : '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          className="btn btn-outline btn-sm text-danger"
                          onClick={() => handleDelete(project.id)}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🏗️ إضافة مشروع جديد</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
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
                  <label className="form-label">الموقع الجغرافي</label>
                  <input
                    className="form-control"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="الرياض، جدة..."
                  />
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
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ المشروع</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
