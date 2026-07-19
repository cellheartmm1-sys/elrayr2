'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ApprovalCenter from './ApprovalCenter';

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  onMenuToggle?: () => void;
}

const roleLabels: Record<string, string> = {
  admin: 'المستخدم الأول (المدير - كافة الصلاحيات)',
  secondary: 'المستخدم الثاني (صلاحيات وموافقات مخصصة)',
  manager: 'مدير عام الشركة',
  engineer: 'مهندس موقع/مشروع',
  supervisor: 'مشرف مواقع ميداني',
  store_keeper: 'أمين مخزن الموقع',
  hr: 'مسؤول الموارد البشرية',
  accountant: 'محاسب مالي'
};

export default function Header({ title, subtitle, icon, onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userName, setUserName] = useState('مدير النظام');
  const [userRole, setUserRole] = useState('admin');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Approval Center state
  const [showApprovalCenter, setShowApprovalCenter] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  useEffect(() => {
    const storedName = localStorage.getItem('user_name');
    const storedRole = localStorage.getItem('user_role');
    if (storedName) setUserName(storedName);
    if (storedRole) setUserRole(storedRole);

    const storedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      setTheme('dark');
    }

    fetchPendingApprovalsCount();
  }, []);

  const fetchPendingApprovalsCount = async () => {
    try {
      const res = await fetch('/api/admin/approvals?status=pending');
      if (res.ok) {
        const data = await res.json();
        setPendingApprovalsCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      console.error('Failed to fetch pending approvals count', err);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const switchUserRole = (newRole: 'admin' | 'secondary') => {
    if (newRole === 'admin') {
      localStorage.setItem('user_role', 'admin');
      localStorage.setItem('user_name', 'مدير النظام (المستخدم الأول)');
      localStorage.setItem('user_email', 'admin@alrayeq.com');
    } else {
      localStorage.setItem('user_role', 'secondary');
      localStorage.setItem('user_name', 'سالم الغامدي (المستخدم الثاني)');
      localStorage.setItem('user_email', 'supervisor1@alrayeq.com');
    }
    setUserRole(newRole);
    setShowUserMenu(false);
    window.location.reload();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('.').substring(0, 5);
  };

  const notifications = [
    { id: 1, text: 'تنبيه: اقترب موعد انتهاء إقامة الموظف "أحمد سعيد" خلال 10 أيام', type: 'warning' },
    { id: 2, text: 'طلب اعتماد ساعات عمل إضافي معلقة لموقع "برج التجارة"', type: 'info' },
    { id: 3, text: 'بلاغ عطل طارئ جديد في "مستشفى الشرق الطبي"', type: 'danger' }
  ];

  return (
    <header className="header" style={{ position: 'fixed', zIndex: 900 }}>
      <div className="header-title">
        {onMenuToggle && (
          <button 
            className="menu-toggle-btn header-icon-btn" 
            onClick={onMenuToggle}
            style={{ 
              display: 'none', 
              marginLeft: '0.75rem',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            title="القائمة الجانبية"
          >
            <span style={{ fontSize: '1.25rem' }}>☰</span>
          </button>
        )}
        {icon && (
          typeof icon === 'string' && (icon.endsWith('.jpg') || icon.endsWith('.png') || icon.startsWith('/')) ? (
            <img src={icon} alt="Logo Icon" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px', marginLeft: '0.5rem' }} />
          ) : (
            <span style={{ fontSize: '1.25rem', marginLeft: '0.5rem' }}>{icon}</span>
          )
        )}

        <div>
          <div>{title}</div>
          {subtitle && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400, display: 'none' }} className="header-subtitle-mobile-hide">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="header-actions">
        {/* Quick User Role Switcher Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.25rem 0.6rem',
          background: userRole === 'admin' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
          border: `1px solid ${userRole === 'admin' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: userRole === 'admin' ? '#10b981' : '#3b82f6'
        }}>
          <span>{userRole === 'admin' ? '👑 المستخدم الأول (Admin)' : '👤 المستخدم الثاني'}</span>
        </div>

        {/* Approval Center Button for Admin */}
        <button
          className="btn btn-outline btn-sm"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            borderColor: pendingApprovalsCount > 0 ? 'rgba(234,179,8,0.6)' : 'var(--border-normal)',
            color: pendingApprovalsCount > 0 ? '#eab308' : 'var(--text-primary)',
            background: pendingApprovalsCount > 0 ? 'rgba(234,179,8,0.1)' : 'transparent',
            padding: '0.35rem 0.75rem',
            fontWeight: 600
          }}
          title="مركز الموافقات المعلقة"
          onClick={() => setShowApprovalCenter(true)}
        >
          <span>📜 مركز الموافقات</span>
          {pendingApprovalsCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        {/* Theme Toggle Button */}
        <button 
          className="header-icon-btn" 
          title={theme === 'dark' ? 'تفعيل الوضع المضيء' : 'تفعيل الوضع المظلم'} 
          onClick={toggleTheme}
          style={{ transition: 'transform 0.3s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(15deg)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'rotate(0)'}
        >
          <span style={{ fontSize: '1.1rem' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>

        {/* Notifications Button */}
        <div style={{ position: 'relative' }}>
          <button 
            className="header-icon-btn" 
            title="الإشعارات" 
            id="notifications-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🔔</span>
            <span className="notification-badge">3</span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '46px',
              left: '0',
              width: '320px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-normal)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-dropdown)',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              animation: 'fadeIn 0.2s ease',
              zIndex: 1000
            }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>🔔 الإشعارات الواردة</span>
                <span className="badge badge-primary">3 جديدة</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                {notifications.map(n => (
                  <div key={n.id} style={{
                    fontSize: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: n.type === 'danger' ? 'rgba(239, 68, 68, 0.08)' : n.type === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.4'
                  }}>
                    {n.text}
                  </div>
                ))}
              </div>
              <div style={{
                textAlign: 'center',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.75rem'
              }}>
                <a href="/hr" style={{ color: 'var(--brand-primary-light)', textDecoration: 'none', fontWeight: 600 }} onClick={() => setShowNotifications(false)}>عرض كل التنبيهات في لوحة الموارد البشرية ←</a>
              </div>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button 
          className="header-icon-btn" 
          title="الإعدادات العامة والصلاحيات" 
          id="settings-btn"
          onClick={() => router.push('/settings')}
        >
          <span style={{ fontSize: '1rem' }}>⚙️</span>
        </button>

        {/* User Button & Switcher */}
        <div style={{ position: 'relative' }}>
          <div 
            className="header-user" 
            id="user-menu-btn"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
          >
            <div className="user-avatar">{getInitials(userName)}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }} className="header-username-mobile-hide">
              {userName}
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>▾</span>
          </div>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div style={{
              position: 'absolute',
              top: '46px',
              left: '0',
              width: '240px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-normal)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-dropdown)',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              animation: 'fadeIn 0.2s ease',
              zIndex: 1000
            }}>
              <div style={{
                padding: '0.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}>
                الحساب الحالي: <strong>{roleLabels[userRole] || userRole}</strong>
              </div>

              {/* Role Switcher options */}
              <div style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                🔄 التبديل السريع بين المستخدمين:
              </div>

              <button
                className={`btn btn-sm ${userRole === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', padding: '0.45rem 0.5rem', fontSize: '0.8rem' }}
                onClick={() => switchUserRole('admin')}
              >
                👑 المستخدم الأول (المدير العام)
              </button>

              <button
                className={`btn btn-sm ${userRole === 'secondary' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', padding: '0.45rem 0.5rem', fontSize: '0.8rem' }}
                onClick={() => switchUserRole('secondary')}
              >
                👤 المستخدم الثاني (موافقات مخصصة)
              </button>

              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0.25rem 0' }} />

              <button 
                className="btn btn-ghost btn-sm" 
                style={{ justifyContent: 'flex-start', padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                onClick={() => {
                  setShowUserMenu(false);
                  router.push('/settings');
                }}
              >
                ⚙️ إعدادات الحساب والصلاحيات
              </button>
              <button 
                className="btn btn-ghost btn-sm text-danger" 
                style={{ justifyContent: 'flex-start', padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                onClick={() => {
                  setShowUserMenu(false);
                  localStorage.clear();
                  router.push('/login');
                }}
              >
                🚪 تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Approval Center Modal */}
      <ApprovalCenter
        isOpen={showApprovalCenter}
        onClose={() => setShowApprovalCenter(false)}
        onRefreshCount={fetchPendingApprovalsCount}
      />
    </header>
  );
}
