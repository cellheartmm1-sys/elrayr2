'use client';

import { useState, useEffect } from 'react';
import { SYSTEM_MODULES } from '@/lib/approvals-types';

interface UserPermissionsManagerProps {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

const roleLabels: Record<string, string> = {
  admin: '👑 مدير النظام (كامل الصلاحيات)',
  secondary: '👤 موظف فرعي (صلاحيات وموافقات مخصصة)',
  manager: 'مدير عام الشركة',
  engineer: 'مهندس موقع/مشروع',
  supervisor: 'مشرف مواقع',
  store_keeper: 'أمين مخزن الموقع',
  hr: 'مسؤول الموارد البشرية',
  accountant: 'محاسب مالي'
};

const roleBadges: Record<string, string> = {
  admin: 'badge-danger',
  secondary: 'badge-info',
  manager: 'badge-purple',
  engineer: 'badge-primary',
  supervisor: 'badge-warning',
  store_keeper: 'badge-muted',
  hr: 'badge-success',
  accountant: 'badge-success'
};

export default function UserPermissionsManager({ onSuccess, onError }: UserPermissionsManagerProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Modal State for Add/Edit User
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [savingUser, setSavingUser] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    full_name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    role: 'secondary'
  });

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (data.length > 0 && !selectedUserId) {
          const defaultUser = data.find((u: any) => u.role === 'secondary') || data[0];
          setSelectedUserId(defaultUser.id);
          fetchPermissions(defaultUser.id);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async (userId: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/permissions?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setPermissions(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch permissions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUserForPermissions = (user: any) => {
    setSelectedUserId(user.id);
    fetchPermissions(user.id);
  };

  const handleTogglePermission = (module: string, field: string, value: boolean) => {
    setPermissions(prev =>
      prev.map(p => {
        if (p.module === module) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUserId) return;
    setSavingPermissions(true);
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          permissions
        })
      });

      if (res.ok) {
        if (onSuccess) onSuccess('تم حفظ صلاحيات المستخدم بنجاح 🎉');
      } else {
        const err = await res.json();
        if (onError) onError(err.error || 'حدث خطأ أثناء حفظ الصلاحيات');
      }
    } catch (err: any) {
      if (onError) onError('فشل الاتصال بالخادم');
    } finally {
      setSavingPermissions(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({
      id: '',
      full_name: '',
      username: '',
      email: '',
      password: '',
      phone: '',
      role: 'secondary'
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (user: any) => {
    setModalMode('edit');
    setFormData({
      id: user.id,
      full_name: user.full_name,
      username: user.username || '',
      email: user.email,
      password: user.password || '',
      phone: user.phone || '',
      role: user.role || 'secondary'
    });
    setShowModal(true);
  };

  // Delete User Account
  const handleDeleteUser = async (user: any) => {
    if (!confirm(`هل أنت متأكد من حذف حساب "${user.full_name}"؟`)) return;

    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onSuccess) onSuccess('تم حذف الحساب بنجاح 🎉');
        fetchUsers();
      } else {
        const err = await res.json();
        if (onError) onError(err.error || 'فشل حذف الحساب');
      }
    } catch (err: any) {
      if (onError) onError('حدث خطأ أثناء الاتصال بالخادم');
    }
  };

  // Submit User Create / Edit Form
  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) {
      if (onError) onError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSavingUser(true);
    try {
      const url = '/api/users';
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        if (onSuccess) onSuccess(modalMode === 'create' ? 'تم إضافة الحساب بنجاح 🎉' : 'تم تعديل بيانات الحساب بنجاح 🎉');
        setShowModal(false);
        fetchUsers();
      } else {
        const err = await res.json();
        if (onError) onError(err.error || 'فشل حفظ بيانات الحساب');
      }
    } catch (err: any) {
      if (onError) onError('حدث خطأ أثناء حفظ بيانات الحساب');
    } finally {
      setSavingUser(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner explaining system dual-user design */}
      <div style={{
        padding: '1.25rem',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(147,51,234,0.08))',
        border: '1px solid rgba(59,130,246,0.25)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '2.5rem' }}>🛡️</div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            نظام إدارة الحسابات والصلاحيات (User Accounts & Access Control)
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            يمكنك هنا إضافة وتعديل وحذف حسابات النظام، وتحديد <strong>كلمة المرور</strong> و <strong>اسم المستخدم</strong>، وتعيين الدور والتراخيص لكل حساب.
          </div>
        </div>
      </div>

      {/* Accounts List & Management Card */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>👥 قائمة حسابات المستخدمين بالنظام</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>إدارة البيانات، اسم الدخول، كلمة المرور، وتعديل الأدوار والصلاحيات</p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontWeight: 600 }}
          >
            + إضافة حساب جديد
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>جاري تحميل الحسابات...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا توجد حسابات مسجلة بالنظام</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card-hover)', textAlign: 'right' }}>
                  <th style={{ padding: '0.85rem' }}>الاسم الكامل</th>
                  <th style={{ padding: '0.85rem' }}>اسم المستخدم (Username)</th>
                  <th style={{ padding: '0.85rem' }}>البريد الإلكتروني</th>
                  <th style={{ padding: '0.85rem' }}>كلمة المرور</th>
                  <th style={{ padding: '0.85rem' }}>التصنيف / الدور</th>
                  <th style={{ padding: '0.85rem', textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '0.85rem', textAlign: 'center' }}>إجراءات الحساب والصلاحيات</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelected = u.id === selectedUserId;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(59,130,246,0.08)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {u.full_name}
                      </td>
                      <td style={{ padding: '0.85rem', fontWeight: 600, color: 'var(--brand-primary-light)' }}>
                        @{u.username || u.email?.split('@')[0]}
                      </td>
                      <td style={{ padding: '0.85rem', color: 'var(--text-secondary)' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {u.password ? '••••••••' : '••••••••'}
                      </td>
                      <td style={{ padding: '0.85rem' }}>
                        <span className={`badge ${roleBadges[u.role] || 'badge-primary'}`} style={{ fontSize: '0.75rem' }}>
                          {roleLabels[u.role] || u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', textAlign: 'center' }}>
                        <span className="badge badge-success">نشط</span>
                      </td>
                      <td style={{ padding: '0.85rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleSelectUserForPermissions(u)}
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                            title="تحدد وتخصيص الصلاحيات في الجدول أدناه"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            ⚙️ الصلاحيات
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="btn btn-outline btn-sm"
                            title="تعديل البيانات وكلمة المرور والدور"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            ✏️ تعديل
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="btn btn-danger btn-sm"
                            title="حذف الحساب"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            🗑️ حذف
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

      {/* Permissions Matrix for Selected Account */}
      {selectedUser && (
        <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(59,130,246,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                مصفوفة صلاحيات الحساب: <span style={{ color: 'var(--brand-primary-light)' }}>{selectedUser.full_name}</span> (@{selectedUser.username || selectedUser.email?.split('@')[0]})
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {selectedUser.role === 'admin'
                  ? '⚠️ المستخدم الأول يمتلك كافة الصلاحيات مباشرة دون موافقات'
                  : 'تخصيص الوصول للأقسام وتحديد شرط موافقة المدير الأول لكل أمر'}
              </p>
            </div>

            {selectedUser.role !== 'admin' && (
              <button
                onClick={handleSavePermissions}
                disabled={savingPermissions || loading}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.25rem', fontWeight: 600 }}
              >
                {savingPermissions ? 'جاري الحفظ...' : '💾 حفظ التعديلات للصلاحيات'}
              </button>
            )}
          </div>

          {selectedUser.role === 'admin' ? (
            <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-md)', color: '#10b981', fontWeight: 600, textAlign: 'center' }}>
              👑 هذا الحساب مصنف كـ "المستخدم الأول / مدير النظام" ويمتلك كافة صلاحيات الوصول والاعتماد والرفض مباشرة في كل الأقسام.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card-hover)', textAlign: 'right' }}>
                    <th style={{ padding: '0.85rem' }}>القسم / الوحدة</th>
                    <th style={{ padding: '0.85rem', textAlign: 'center' }}>عرض (View)</th>
                    <th style={{ padding: '0.85rem', textAlign: 'center' }}>إضافة (Create)</th>
                    <th style={{ padding: '0.85rem', textAlign: 'center' }}>تعديل (Edit)</th>
                    <th style={{ padding: '0.85rem', textAlign: 'center' }}>حذف (Delete)</th>
                    <th style={{ padding: '0.85rem', textAlign: 'center' }}>تطلب موافقة المدير الأول</th>
                  </tr>
                </thead>
                <tbody>
                  {SYSTEM_MODULES.map(moduleItem => {
                    const perm = permissions.find(p => p.module === moduleItem.id) || {
                      can_view: true, can_create: false, can_edit: false, can_delete: false, requires_approval: true
                    };

                    return (
                      <tr key={moduleItem.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {moduleItem.name}
                        </td>
                        <td style={{ padding: '0.85rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={perm.can_view}
                            onChange={e => handleTogglePermission(moduleItem.id, 'can_view', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '0.85rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={perm.can_create}
                            onChange={e => handleTogglePermission(moduleItem.id, 'can_create', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '0.85rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={perm.can_edit}
                            onChange={e => handleTogglePermission(moduleItem.id, 'can_edit', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '0.85rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={perm.can_delete}
                            onChange={e => handleTogglePermission(moduleItem.id, 'can_delete', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '0.85rem', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.25rem 0.6rem',
                            background: perm.requires_approval ? 'rgba(234,179,8,0.15)' : 'rgba(107,114,128,0.1)',
                            border: `1px solid ${perm.requires_approval ? 'rgba(234,179,8,0.4)' : 'var(--border-subtle)'}`,
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            color: perm.requires_approval ? '#eab308' : 'var(--text-muted)'
                          }}>
                            <input
                              type="checkbox"
                              checked={perm.requires_approval}
                              onChange={e => handleTogglePermission(moduleItem.id, 'requires_approval', e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                            {perm.requires_approval ? 'مطلوب الموافقة 🔔' : 'مباشر'}
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
      )}

      {/* Add / Edit User Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-normal)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-modal)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-card-hover)',
              flexShrink: 0
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {modalMode === 'create' ? '➕ إضافة حساب مستخدم جديد' : '✏️ تعديل بيانات الحساب والدور'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitUser} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flex: 1 }}>
              <div className="form-group">
                <label className="form-label required">الاسم الكامل</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="مثال: أحمد محمود"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">اسم المستخدم (اسم الدخول - Username)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="مثال: ahmed_m"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">البريد الإلكتروني</label>
                <input
                  type="email"
                  className="form-control"
                  required
                  placeholder="name@alrayeq.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">كلمة المرور (Password)</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder={modalMode === 'edit' ? 'اتركه فارغاً للإبقاء على كلمة المرور الحالية...' : 'أدخل كلمة المرور (الافتراضي 123456)'}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="0550000000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">التصنيف والدور في النظام</label>
                <select
                  className="form-control"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="admin">👑 مدير النظام (كامل الصلاحيات)</option>
                  <option value="secondary">👤 موظف فرعي (صلاحيات وموافقات مخصصة)</option>
                  <option value="manager">مدير عام الشركة</option>
                  <option value="engineer">مهندس موقع/مشروع</option>
                  <option value="supervisor">مشرف مواقع</option>
                  <option value="store_keeper">أمين مخزن</option>
                  <option value="hr">مسؤول الموارد البشرية</option>
                  <option value="accountant">محاسب مالي</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="btn btn-primary"
                  style={{ fontWeight: 600 }}
                >
                  {savingUser ? 'جاري الحفظ...' : '💾 حفظ البيانات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
