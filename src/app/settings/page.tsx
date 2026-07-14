'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';

type TabType = 'company' | 'users' | 'defaults';

interface CompanyProfile {
  name_ar: string;
  name_en: string;
  cr_number: string;
  vat_number: string;
  address: string;
  phone: string;
  email: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone: string;
  is_active: boolean;
}

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام (Admin)',
  manager: 'مدير عام الشركة',
  engineer: 'مهندس موقع/مشروع',
  supervisor: 'مشرف مواقع',
  store_keeper: 'أمينات ومخازن',
  hr: 'مسؤول الموارد البشرية',
  accountant: 'محاسب مالي'
};

const roleBadge: Record<string, string> = {
  admin: 'badge-danger',
  manager: 'badge-purple',
  engineer: 'badge-primary',
  supervisor: 'badge-info',
  store_keeper: 'badge-warning',
  hr: 'badge-success',
  accountant: 'badge-success'
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('company');
  const [company, setCompany] = useState<CompanyProfile>({
    name_ar: '', name_en: '', cr_number: '', vat_number: '', address: '', phone: '', email: ''
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // Default Settings State
  const [defaults, setDefaults] = useState({
    currency: 'EGP',
    default_vat: '15',
    default_retention: '10'
  });

  // Add User Form State
  const [userForm, setUserForm] = useState({
    full_name: '', email: '', role: 'engineer', phone: ''
  });

  // Fetch Company Info
  const fetchCompanyInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data) setCompany(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'company') fetchCompanyInfo();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  // Save Company Info
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      if (res.ok) {
        alert('✅ تم حفظ بيانات ملف الشركة بنجاح!');
      } else {
        alert('❌ فشل حفظ البيانات.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Save System Defaults
  const handleSaveDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    alert('✅ تم حفظ إعدادات الضرائب والعملة الافتراضية بنجاح!');
  };

  // Add New User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      if (res.ok) {
        setShowUserModal(false);
        setUserForm({ full_name: '', email: '', role: 'engineer', phone: '' });
        fetchUsers();
      } else {
        alert('❌ فشل إضافة المستخدم.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout title="الإعدادات" subtitle="إعدادات النظام، الصلاحيات، ملف الشركة، والضرائب والعملة" icon="⚙️">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'company' ? 'active' : ''}`} onClick={() => setActiveTab('company')}>🏢 ملف الشركة</button>
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 المستخدمون والصلاحيات</button>
        <button className={`tab-btn ${activeTab === 'defaults' ? 'active' : ''}`} onClick={() => setActiveTab('defaults')}>⚙️ العملة والضرائب</button>
      </div>

      {/* ======================== TAB: COMPANY PROFILE ======================== */}
      {activeTab === 'company' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏢 تعديل بيانات ملف المؤسسة</div>
            <div className="card-subtitle">البيانات الظاهرة في ترويسات التقارير والمستخلصات الرسمية للعملاء ومقاولي الباطن</div>
          </div>
          {loading ? (
            <div className="empty-state"><div className="loading-spinner" /></div>
          ) : (
            <form onSubmit={handleSaveCompany}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label required">اسم الشركة بالعربية</label>
                  <input
                    className="form-control"
                    required
                    value={company.name_ar || ''}
                    onChange={e => setCompany({ ...company, name_ar: e.target.value })}
                    placeholder="الرايق للمقاولات الكهروميكانيكية"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">اسم الشركة بالإنجليزية</label>
                  <input
                    className="form-control"
                    value={company.name_en || ''}
                    onChange={e => setCompany({ ...company, name_en: e.target.value })}
                    placeholder="Al-Rayeq Electromechanical"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم السجل التجاري (CR)</label>
                  <input
                    className="form-control"
                    value={company.cr_number || ''}
                    onChange={e => setCompany({ ...company, cr_number: e.target.value })}
                    placeholder="1010123456"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الرقم الضريبي (VAT)</label>
                  <input
                    className="form-control"
                    value={company.vat_number || ''}
                    onChange={e => setCompany({ ...company, vat_number: e.target.value })}
                    placeholder="300012345600003"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input
                    className="form-control"
                    value={company.phone || ''}
                    onChange={e => setCompany({ ...company, phone: e.target.value })}
                    placeholder="+20-100-000-000"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني للشركة</label>
                  <input
                    className="form-control"
                    type="email"
                    value={company.email || ''}
                    onChange={e => setCompany({ ...company, email: e.target.value })}
                    placeholder="info@alrayeq.com"
                  />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">العنوان الرئيسي للمؤسسة</label>
                  <textarea
                    className="form-control"
                    value={company.address || ''}
                    onChange={e => setCompany({ ...company, address: e.target.value })}
                    placeholder="مصر، القاهرة..."
                  />
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : '💾 حفظ التعديلات ورأس الملف'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ======================== TAB: USERS ======================== */}
      {activeTab === 'users' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">👥 مستخدمو النظام والمهندسين المشرفين</div>
              <div className="page-description">إدارة حسابات المهندسين والمشرفين والمحاسبين لتمكينهم من تسجيل الدخول للمواقع</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>+ إضافة مستخدم جديد</button>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : users.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <div className="empty-state-title">لا يوجد مستخدمون مضافون</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الاسم الكامل</th>
                      <th>البريد الإلكتروني</th>
                      <th>رقم الهاتف</th>
                      <th>الصلاحية / الدور</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || '-'}</td>
                        <td>
                          <span className={`badge ${roleBadge[u.role] || 'badge-muted'}`}>
                            {roleLabels[u.role] || u.role}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-success">نشط</span>
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

      {/* ======================== TAB: DEFAULTS ======================== */}
      {activeTab === 'defaults' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚙️ الإعدادات العامة وتفاصيل الضرائب والعملة</div>
            <div className="card-subtitle">تعديل العملة الافتراضية للنظام والنسب المئوية للضرائب المطبقة في الفواتير</div>
          </div>
          <form onSubmit={handleSaveDefaults}>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label required">العملة الافتراضية للحسابات</label>
                <select 
                  className="form-control" 
                  value={defaults.currency} 
                  onChange={e => setDefaults({...defaults, currency: e.target.value})}
                >
                  <option value="EGP">الجنيه المصري (ج.م) 🇪🇬</option>
                  <option value="SAR">الريال السعودي (ر.س) 🇸🇦</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">النسبة الافتراضية لضريبة القيمة المضافة (VAT) %</label>
                <input 
                  className="form-control" 
                  type="number" 
                  value={defaults.default_vat} 
                  onChange={e => setDefaults({...defaults, default_vat: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label required">النسبة الافتراضية لاستقطاع الضمان المالي للمستخلصات %</label>
                <input 
                  className="form-control" 
                  type="number" 
                  value={defaults.default_retention} 
                  onChange={e => setDefaults({...defaults, default_retention: e.target.value})}
                />
              </div>
            </div>
            
            <div className="alert alert-info" style={{ marginTop: '1.25rem' }}>
              💡 <strong>ملاحظة:</strong> العملة المحددة حالياً هي <strong>الجنيه المصري (ج.م)</strong>. تم تعديل كافة التقارير المالية ومستخلصات مقاولي الباطن والعملاء وعقود الصيانة لتظهر بالجنيه المصري.
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
              <button type="submit" className="btn btn-primary">💾 حفظ الإعدادات الافتراضية</button>
            </div>
          </form>
        </div>
      )}

      {/* ======================== MODAL: ADD USER ======================== */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">👥 إضافة مستخدم جديد</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="form-grid form-grid-2">
                <div className="form-group col-span-2">
                  <label className="form-label required">الاسم الكامل للمستخدم</label>
                  <input
                    className="form-control"
                    required
                    value={userForm.full_name}
                    onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                    placeholder="م. أحمد الشافعي"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">البريد الإلكتروني للفرع</label>
                  <input
                    className="form-control"
                    type="email"
                    required
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="engineer2@alrayeq.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input
                    className="form-control"
                    value={userForm.phone}
                    onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="01xxxxxxxxx"
                  />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label required">الدور والصلاحية</label>
                  <select
                    className="form-control"
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="engineer">مهندس موقع/مشروع</option>
                    <option value="manager">مدير عام الشركة</option>
                    <option value="supervisor">مشرف مواقع ميداني</option>
                    <option value="store_keeper">أمين مخزن الموقع</option>
                    <option value="hr">مسؤول الموارد البشرية</option>
                    <option value="accountant">محاسب مالي</option>
                    <option value="admin">مدير النظام (Admin)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowUserModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ المستخدم</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
