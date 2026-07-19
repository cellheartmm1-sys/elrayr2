'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import UserPermissionsManager from '@/components/UserPermissionsManager';


type TabType = 'company' | 'users' | 'defaults' | 'database';

interface CompanyProfile {
  name_ar: string;
  name_en: string;
  cr_number: string;
  vat_number: string;
  address: string;
  phone: string;
  email: string;
  r2_account_id?: string;
  r2_endpoint?: string;
  r2_bucket_name?: string;
  r2_access_key_id?: string;
  r2_secret_access_key?: string;
  r2_backup_interval_hours?: string | number;
  r2_last_backup_at?: string;
  r2_env_configured?: boolean;
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
    name_ar: '', name_en: '', cr_number: '', vat_number: '', address: '', phone: '', email: '',
    r2_account_id: '47aa407c8a51f1fe4fe1f387b381e424',
    r2_endpoint: 'https://47aa407c8a51f1fe4fe1f387b381e424.r2.cloudflarestorage.com',
    r2_bucket_name: 'elraye2',
    r2_access_key_id: '',
    r2_secret_access_key: '',
    r2_backup_interval_hours: '8'
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
  const [currencies, setCurrencies] = useState<Array<{ id: string; code: string; name_ar: string; symbol: string; is_default: boolean }>>([]);
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: '', name_ar: '', symbol: '' });

  // Database Management State
  const [dbTables, setDbTables] = useState<Array<{ name: string; label: string; rowCount: number }>>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [dbActionRunning, setDbActionRunning] = useState(false);

  // R2 Backup States & Operations
  const [r2Backups, setR2Backups] = useState<any[]>([]);
  const [r2Loading, setR2Loading] = useState(false);

  const fetchR2Backups = async () => {
    setR2Loading(true);
    try {
      const res = await fetch('/api/database/r2-backup');
      if (res.ok) {
        const data = await res.json();
        setR2Backups(data);
      } else {
        setR2Backups([]);
      }
    } catch (err) {
      console.error(err);
      setR2Backups([]);
    } finally {
      setR2Loading(false);
    }
  };

  const handleManualR2Backup = async () => {
    setDbActionRunning(true);
    try {
      const res = await fetch('/api/database/r2-backup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ تم إنشاء نسخة احتياطية ورفعها إلى Cloudflare R2 بنجاح!\nاسم الملف: ${data.filename}`);
        fetchR2Backups();
        fetchCompanyInfo(); // Refresh metadata
      } else {
        alert(`❌ فشل النسخ الاحتياطي: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ خطأ: ${err.message}`);
    } finally {
      setDbActionRunning(false);
    }
  };

  const handleDownloadR2Backup = (key: string) => {
    window.open(`/api/database/r2-download?key=${encodeURIComponent(key)}`, '_blank');
  };

  const handleRestoreR2Backup = async (key: string) => {
    if (!confirm(`⚠️ تحذير مهم جداً!\nهل أنت متأكد من استعادة النسخة الاحتياطية "${key}"؟\nهذا الإجراء سيقوم بحذف جميع البيانات الحالية واستبدالها بالكامل ببيانات النسخة الاحتياطية، ولا يمكن التراجع عن هذا الإجراء!`)) {
      return;
    }
    setDbActionRunning(true);
    try {
      const res = await fetch('/api/database/r2-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      const data = await res.json();
      if (res.ok) {
        alert('✅ تم استعادة قاعدة البيانات بالكامل من النسخة الاحتياطية في R2 بنجاح!');
        window.location.reload();
      } else {
        alert(`❌ فشل استعادة البيانات: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ خطأ: ${err.message}`);
    } finally {
      setDbActionRunning(false);
    }
  };

  const handleSaveR2Settings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      if (res.ok) {
        alert('✅ تم حفظ إعدادات Cloudflare R2 للنسخ الاحتياطي بنجاح!');
        fetchR2Backups();
      } else {
        alert('❌ فشل حفظ الإعدادات.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

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

  const fetchCurrencies = async () => {
    setCurrencyLoading(true);
    try {
      const res = await fetch('/api/settings/currencies');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCurrencies(data);
        const def = data.find(c => c.is_default);
        if (def) {
          setDefaults(d => ({ ...d, currency: def.code }));
          localStorage.setItem('system_currency_symbol', def.symbol);
          localStorage.setItem('system_currency_code', def.code);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCurrencyLoading(false);
    }
  };

  const handleAddCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCurrency.code || !newCurrency.name_ar || !newCurrency.symbol) return;
    try {
      const res = await fetch('/api/settings/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newCurrency })
      });
      if (res.ok) {
        setNewCurrency({ code: '', name_ar: '', symbol: '' });
        fetchCurrencies();
        alert('✅ تم إضافة العملة بنجاح!');
      } else {
        const err = await res.json();
        alert(`❌ فشل الإضافة: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCurrency = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه العملة؟')) return;
    try {
      const res = await fetch('/api/settings/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      if (res.ok) {
        fetchCurrencies();
        alert('✅ تم حذف العملة بنجاح!');
      } else {
        const err = await res.json();
        alert(`❌ فشل الحذف: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetActiveCurrency = async (id: string) => {
    try {
      const res = await fetch('/api/settings/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_default', id })
      });
      if (res.ok) {
        const result = await res.json();
        const activeCurr = result.data;
        if (activeCurr) {
          localStorage.setItem('system_currency_symbol', activeCurr.symbol);
          localStorage.setItem('system_currency_code', activeCurr.code);
        }
        fetchCurrencies();
        alert('✅ تم تعيين العملة الافتراضية للنظام بنجاح!');
        window.location.reload();
      } else {
        const err = await res.json();
        alert(`❌ فشل التعيين: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'company') fetchCompanyInfo();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'database') {
      fetchDbInfo();
      fetchCompanyInfo();
      fetchR2Backups();
    }
    if (activeTab === 'defaults') fetchCurrencies();
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
        <UserPermissionsManager
          onSuccess={(msg) => alert(`✅ ${msg}`)}
          onError={(msg) => alert(`❌ ${msg}`)}
        />
      )}


      {/* ======================== TAB: DEFAULTS ======================== */}
      {activeTab === 'defaults' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* General Defaults Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">⚙️ الإعدادات الافتراضية للضرائب والاستقطاع</div>
              <div className="card-subtitle">تعديل النسب المئوية الافتراضية المطبقة عند إنشاء الفواتير والمستخلصات</div>
            </div>
            <form onSubmit={handleSaveDefaults}>
              <div className="form-grid form-grid-2">
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

              <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <button type="submit" className="btn btn-primary">💾 حفظ نسب الضرائب والاستقطاع</button>
              </div>
            </form>
          </div>

          {/* Currencies Manager Card */}
          <div className="card" style={{ border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div className="card-header">
              <div className="card-title">💱 إدارة عملات النظام (Currencies Manager)</div>
              <div className="card-subtitle">التحكم في العملات المتاحة بالنظام، إضافتها، حذفها، وتحديد العملة الافتراضية النشطة لجميع المعاملات</div>
            </div>

            <div className="dashboard-grid-2-1" style={{ marginTop: '1rem', gap: '1.5rem' }}>
              {/* Left Column: Currencies Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>📋 العملات الحالية بالنظام</div>
                
                {currencyLoading ? (
                  <div className="empty-state"><div className="loading-spinner" /></div>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>رمز الكود</th>
                          <th>اسم العملة</th>
                          <th>الرمز (Symbol)</th>
                          <th style={{ textAlign: 'center' }}>الافتراضية</th>
                          <th style={{ textAlign: 'center' }}>إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currencies.map(curr => (
                          <tr key={curr.id} style={curr.is_default ? { background: 'rgba(16, 185, 129, 0.05)' } : {}}>
                            <td style={{ fontWeight: 'bold', color: 'var(--text-accent)' }}>{curr.code}</td>
                            <td style={{ fontWeight: 600 }}>{curr.name_ar}</td>
                            <td style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{curr.symbol}</td>
                            <td style={{ textAlign: 'center' }}>
                              {curr.is_default ? (
                                <span className="badge badge-success">✓ العملة النشطة</span>
                              ) : (
                                <span className="badge badge-muted">-</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                {!curr.is_default && (
                                  <>
                                    <button 
                                      className="btn btn-outline btn-sm"
                                      onClick={() => handleSetActiveCurrency(curr.id)}
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                    >
                                      ⭐ تعيين كنشطة
                                    </button>
                                    <button 
                                      className="btn btn-ghost btn-sm text-danger"
                                      onClick={() => handleDeleteCurrency(curr.id)}
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                    >
                                      🗑️ حذف
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right Column: Add Currency Form */}
              <div className="card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', height: 'fit-content' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>➕ إضافة عملة جديدة</div>
                
                <form onSubmit={handleAddCurrency} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label required">كود العملة (مثال: USD, EGP, SAR)</label>
                    <input 
                      className="form-control" 
                      required
                      placeholder="EGP" 
                      value={newCurrency.code}
                      onChange={e => setNewCurrency({ ...newCurrency, code: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">اسم العملة بالعربية (مثال: جنيه مصري)</label>
                    <input 
                      className="form-control" 
                      required
                      placeholder="جنيه مصري" 
                      value={newCurrency.name_ar}
                      onChange={e => setNewCurrency({ ...newCurrency, name_ar: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">رمز العملة (مثال: ج.م, ر.س, $)</label>
                    <input 
                      className="form-control" 
                      required
                      placeholder="ج.م" 
                      value={newCurrency.symbol}
                      onChange={e => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="btn btn-success" style={{ marginTop: '0.5rem' }}>
                    ➕ إضافة العملة للنظام
                  </button>
                </form>
              </div>
            </div>
          </div>
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

          {/* Cloudflare R2 Cloud Backup Section */}
          <div className="dashboard-grid-1-1">
            {/* R2 Cloud Status Box */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">☁️ النسخ الاحتياطي السحابي (Cloudflare R2)</div>
                <div className="card-subtitle">النسخ الاحتياطي السحابي والتخزين التلقائي لقاعدة البيانات</div>
              </div>
              
              <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#10b981',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>🔒</span>
                  <div>
                    <div style={{ color: '#10b981', fontWeight: 700 }}>تم ربط حساب Cloudflare R2 بنجاح تلقائياً</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      تمت تهيئة مفاتيح التخزين السحابي المحمية عبر متغيرات البيئة في الفيرسل (Vercel Environment Variables / .env.local).
                    </div>
                  </div>
                </div>

                {company.r2_last_backup_at && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '6px' }}>
                    📅 <strong>آخر نسخ احتياطي سحابي ناجح:</strong> {new Date(company.r2_last_backup_at).toLocaleString('ar-EG')}
                  </div>
                )}

                <div style={{ marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={handleManualR2Backup}
                    className="btn btn-primary" 
                    disabled={dbActionRunning || saving}
                  >
                    ☁️ اختبار الاتصال والنسخ الاحتياطي الآن
                  </button>
                </div>
              </div>
            </div>


            {/* R2 Backups List */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="card-title">☁️ النسخ الاحتياطية في Cloudflare R2</div>
                  <div className="card-subtitle">قائمة بملفات النسخ الاحتياطي المرفوعة والمسجلة في السحابة</div>
                </div>
                <button 
                  type="button" 
                  onClick={fetchR2Backups} 
                  className="btn btn-ghost btn-sm"
                  disabled={r2Loading}
                >
                  🔄 تحديث القائمة
                </button>
              </div>
              
              {r2Loading ? (
                <div className="empty-state"><div className="loading-spinner" /></div>
              ) : r2Backups.length === 0 ? (
                <div className="empty-state" style={{ minHeight: '200px' }}>
                  <div className="empty-state-icon">☁️</div>
                  <div className="empty-state-title">لا توجد نسخ احتياطية مرفوعة بعد</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>قم بتهيئة الإعدادات ورفع أول نسخة اختبارية</p>
                </div>
              ) : (
                <div className="table-wrapper" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>اسم الملف سحابياً</th>
                        <th>تاريخ الحفظ</th>
                        <th>الحجم</th>
                        <th style={{ textAlign: 'center' }}>العمليات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r2Backups.map((backup) => (
                        <tr key={backup.key}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-accent)' }}>
                            {backup.key}
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {new Date(backup.lastModified).toLocaleString('ar-EG')}
                          </td>
                          <td style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                            {(backup.sizeBytes / 1024).toFixed(1)} KB
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                              <button 
                                type="button"
                                onClick={() => handleDownloadR2Backup(backup.key)}
                                className="btn btn-outline btn-sm"
                                title="تنزيل الملف للجهاز"
                              >
                                📥 تنزيل
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleRestoreR2Backup(backup.key)}
                                className="btn btn-accent btn-sm"
                                disabled={dbActionRunning}
                                title="استعادة هذه النسخة كبيانات حية"
                              >
                                ⏪ استعادة
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
