'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  onMenuToggle?: () => void;
}

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام (Admin)',
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
  const [userName, setUserName] = useState('محمد العمري');
  const [userRole, setUserRole] = useState('admin');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
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
        {icon && <span style={{ fontSize: '1.25rem' }}>{icon}</span>}
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
                justifyContent: 'between',
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
          title="الإعدادات العامة" 
          id="settings-btn"
          onClick={() => router.push('/settings')}
        >
          <span style={{ fontSize: '1rem' }}>⚙️</span>
        </button>

        {/* User Button */}
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
              width: '180px',
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
                الدور: <strong>{roleLabels[userRole] || userRole}</strong>
              </div>
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ justifyContent: 'flex-start', padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                onClick={() => {
                  setShowUserMenu(false);
                  router.push('/settings');
                }}
              >
                ⚙️ إعدادات الحساب
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
    </header>
  );
}
