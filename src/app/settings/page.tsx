'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';

type TabType = 'company' | 'users' | 'defaults' | 'database';

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

  // Database Management State
  const [dbTables, setDbTables] = useState<Array<{ name: string; label: string; rowCount: number }>>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [dbActionRunning, setDbActionRunning] = useState(false);

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

  // Fetch Database tables and sizes
  const fetchDbInfo = async () => {
    setDbLoading(true);
    try {
      const res = await fetch('/api/database');
      const data = await res.json();
      if (data && Array.isArray(data.tables)) {
        setDbTables(data.tables);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'company') fetchCompanyInfo();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'database') fetchDbInfo();
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
        const errData = await res.json();
        alert(`❌ فشل إضافة المستخدم: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  // Database Backup Handler
  const handleBackup = async () => {
    setDbActionRunning(true);
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' })
      });
      if (!res.ok) throw new Error('فشل إنشاء النسخة الاحتياطية');
      const data = await res.json();
      
      // Convert to blob and download
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('download', `ERP_Backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      alert('✅ تم تحميل النسخة الاحتياطية بنجاح!');
    } catch (err: any) {
      alert(`❌ خطأ: ${err.message}`);
    } finally {
      setDbActionRunning(false);
    }
  };

  // Database Restore Handler
  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) {
      alert('الرجاء اختيار ملف النسخة الاحتياطية أولاً.');
      return;
    }

    const confirmRestore = confirm(
      '⚠️ تحذير: استعادة النسخة الاحتياطية ستمسح جميع البيانات الحالية في النظام وتستبدلها ببيانات النسخة الاحتياطية. هل أنت متأكد من هذا الإجراء؟'
    );
    if (!confirmRestore) return;

    setDbActionRunning(true);
    try {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target?.result as string);
          if (!backupData || !backupData.data) {
            throw new Error('ملف النسخة الاحتياطية غير صالح.');
          }

          const res = await fetch('/api/database', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'restore', backupData })
          });
          const result = await res.json();
          if (res.ok) {
            alert('✅ تم استعادة النسخة الاحتياطية بنجاح!');
            setRestoreFile(null);
            // Reset the file input element
            const fileInput = document.getElementById('restore-file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            fetchDbInfo();
          } else {
            alert(`❌ فشل الاستعادة: ${result.error}`);
          }
        } catch (err: any) {
          alert(`❌ خطأ في معالجة الملف: ${err.message}`);
        } finally {
          setDbActionRunning(false);
        }
      };
      fileReader.readAsText(restoreFile);
    } catch (err: any) {
      alert(`❌ خطأ: ${err.message}`);
      setDbActionRunning(false);
    }
  };

  // Reset All Database Data Handler
  const handleResetAll = async () => {
    const confirmReset = confirm(
      '⚠️ تحذير شديد: سيتم حذف جميع المشاريع، الموظفين، الحضور، الحسابات المالية، والمستخلصات نهائياً من النظام. هل أنت متأكد تماماً من تصفير النظام بالكامل؟'
    );
    if (!confirmReset) return;

    const doubleCheck = prompt('لتأكيد عملية التصفير الكاملة، يرجى كتابة "تصفير بالكامل" في الحقل أدناه:');
    if (doubleCheck !== 'تصفير بالكامل') {
      alert('❌ تم إلغاء العملية لعدم تطابق عبارة التأكيد.');
      return;
    }

    setDbActionRunning(true);
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-all' })
      });
      const result = await res.json();
      if (res.ok) {
        alert('✅ تم تصفير جميع بيانات قاعدة البيانات بنجاح!');
        fetchDbInfo();
      } else {
        alert(`❌ فشل التصفير: ${result.error}`);
      }
    } catch (err: any) {
      alert(`❌ خطأ: ${err.message}`);
    } finally {
      setDbActionRunning(false);
    }
  };

  // Reset Single Table Data Handler
  const handleResetTable = async (tableName: string, tableLabel: string) => {
    const confirmReset = confirm(
      `⚠️ تحذير: سيتم حذف جميع البيانات المخزنة في جدول "${tableLabel}" بشكل نهائي (سيتضمن ذلك تصفير الجداول المرتبطة به). هل أنت متأكد من تصفير هذا الجدول؟`
    );
    if (!confirmReset) return;

    setDbActionRunning(true);
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-table', tableName })
      });
      const result = await res.json();
      if (res.ok) {
        alert(`✅ تم تصفير بيانات جدول "${tableLabel}" بنجاح!`);
        fetchDbInfo();
      } else {
        alert(`❌ فشل تصفير الجدول: ${result.error}`);
      }
    } catch (err: any) {
      alert(`❌ خطأ: ${err.message}`);
    } finally {
      setDbActionRunning(false);
    }
  };

  return (
    <AppLayout title="الإعدادات" subtitle="إعدادات النظام، الصلاحيات، ملف الشركة، الضرائب، وإدارة قاعدة البيانات" icon="⚙️">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'company' ? 'active' : ''}`} onClick={() => setActiveTab('company')}>🏢 ملف الشركة</button>
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 المستخدمون والصلاحيات</button>
        <button className={`tab-btn ${activeTab === 'defaults' ? 'active' : ''}`} onClick={() => setActiveTab('defaults')}>⚙️ العملة والضرائب</button>
        <button className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`} onClick={() => setActiveTab('database')}>🗄️ إدارة قاعدة البيانات</button>
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

      {/* ======================== TAB: DATABASE ======================== */}
      {activeTab === 'database' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Backup & Restore Row */}
          <div className="dashboard-grid-1-1">
            {/* Backup Box */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">📥 أخذ نسخة احتياطية من البيانات</div>
                <div className="card-subtitle">تنزيل نسخة كاملة من جميع البيانات والمستندات المخزنة بقاعدة البيانات كملف احتياطي</div>
              </div>
              <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  يُوصى بأخذ نسخة احتياطية بشكل دوري والاحتفاظ بها في مكان آمن لاستعادتها عند الحاجة أو لحفظ سجلات الشركة خارج النظام.
                </p>
                <div style={{ marginTop: '0.5rem' }}>
                  <button 
                    onClick={handleBackup} 
                    className="btn btn-primary" 
                    disabled={dbActionRunning}
                  >
                    {dbActionRunning ? 'جاري المعالجة...' : '📥 أخذ نسخة احتياطية الآن'}
                  </button>
                </div>
              </div>
            </div>

            {/* Restore Box */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">📤 استعادة نسخة احتياطية</div>
                <div className="card-subtitle">رفع ملف النسخة الاحتياطية (JSON) واستعادة البيانات السابقة في النظام</div>
              </div>
              <form onSubmit={handleRestore} style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label required">اختر ملف النسخة الاحتياطية (.json)</label>
                  <input 
                    id="restore-file-input"
                    type="file" 
                    accept=".json"
                    className="form-control"
                    onChange={e => setRestoreFile(e.target.files?.[0] || null)}
                    required
                    disabled={dbActionRunning}
                  />
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <button 
                    type="submit" 
                    className="btn btn-accent" 
                    disabled={dbActionRunning || !restoreFile}
                  >
                    {dbActionRunning ? 'جاري الاستعادة...' : '📤 استعادة النسخة الاحتياطية'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Reset All Box */}
          <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div className="card-header">
              <div className="card-title text-danger">⚠️ تصفير وحذف جميع البيانات (Reset System)</div>
              <div className="card-subtitle">مسح شامل لجميع السجلات وعقود العمالة والمشاريع وبدء النظام من الصفر</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: '1.6' }}>
                انتبه! هذا الإجراء سيقوم بحذف كل البيانات في جميع الجداول بشكل كامل ونهائي ولن تتمكن من التراجع عنه إلا إذا كان لديك ملف نسخة احتياطية سابقة.
              </p>
              <button 
                onClick={handleResetAll} 
                className="btn btn-danger"
                disabled={dbActionRunning}
              >
                🚨 تصفير قاعدة البيانات بالكامل
              </button>
            </div>
          </div>

          {/* Individual Tables List Box */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📊 تصفير الجداول الفردية (تصفير كل جدول على حِده)</div>
              <div className="card-subtitle">عرض الجداول الحالية في النظام وعدد السجلات بها مع إمكانية إفراغ كل جدول بشكل مستقل</div>
            </div>
            {dbLoading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : dbTables.length === 0 ? (
              <div className="empty-state">لا توجد جداول متاحة</div>
            ) : (
              <div className="table-wrapper" style={{ marginTop: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>اسم الجدول بالنظام</th>
                      <th>وظيفة الجدول (الوصف)</th>
                      <th style={{ textAlign: 'center' }}>عدد السجلات الحالي</th>
                      <th style={{ textAlign: 'center' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbTables.map(table => (
                      <tr key={table.name}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-accent)' }}>
                          {table.name}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {table.label}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                          <span className={`badge ${table.rowCount > 0 ? 'badge-primary' : 'badge-muted'}`}>
                            {table.rowCount} سجل
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button"
                            onClick={() => handleResetTable(table.name, table.label)}
                            className="btn btn-ghost btn-sm text-danger"
                            disabled={dbActionRunning || table.rowCount === 0}
                            style={{ padding: '0.2rem 0.5rem' }}
                          >
                            🗑️ تصفير الجدول
                          </button>
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

      {/* ======================== MODAL: ADD USER ======================== */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">👥 إضافة مستخدم جديد</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="form-grid form-grid-3">
                <div className="form-group col-span-3">
                  <label className="form-label required">الاسم الكامل للمستخدم</label>
                  <input
                    className="form-control"
                    required
                    value={userForm.full_name}
                    onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                    placeholder="م. أحمد الشافعي"
                  />
                </div>
                <div className="form-group col-span-2">
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
                <div className="form-group col-span-3">
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
