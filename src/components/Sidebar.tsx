'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    section: 'الرئيسية',
    items: [
      { href: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
    ],
  },
  {
    section: 'إدارة الأعمال',
    items: [
      { href: '/projects', label: 'المشاريع', icon: '🏗️' },
      { href: '/estimation', label: 'الهندسة والتسعير', icon: '📐' },
      { href: '/procurement', label: 'المشتريات والمخازن', icon: '📦' },
    ],
  },
  {
    section: 'العمليات',
    items: [
      { href: '/subcontractors', label: 'مقاولو الباطن', icon: '🤝' },
      { href: '/labor', label: 'العمالة اليومية', icon: '👷' },
      { href: '/maintenance', label: 'الصيانة والتشغيل', icon: '🔧' },
    ],
  },
  {
    section: 'المالية والموارد',
    items: [
      { href: '/finance', label: 'المالية والمستخلصات', icon: '💰' },
      { href: '/hr', label: 'الموارد البشرية', icon: '👨‍💼' },
    ],
  },
  {
    section: 'الإدارة',
    items: [
      { href: '/settings', label: 'الإعدادات', icon: '⚙️' },
    ],
  },
];

const rolePermissions: Record<string, string[]> = {
  admin: ['/dashboard', '/projects', '/estimation', '/procurement', '/subcontractors', '/labor', '/maintenance', '/finance', '/hr', '/settings'],
  manager: ['/dashboard', '/projects', '/estimation', '/procurement', '/subcontractors', '/labor', '/maintenance', '/finance', '/hr', '/settings'],
  engineer: ['/dashboard', '/projects', '/procurement', '/labor'],
  supervisor: ['/dashboard', '/projects', '/labor'],
  store_keeper: ['/dashboard', '/procurement'],
  hr: ['/dashboard', '/hr', '/labor'],
  accountant: ['/dashboard', '/finance', '/subcontractors']
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState('admin');

  useEffect(() => {
    const storedRole = localStorage.getItem('user_role');
    if (storedRole) setRole(storedRole);
  }, []);

  const allowedHrefs = rolePermissions[role] || rolePermissions['admin'];

  // Automatically close sidebar on route change on mobile
  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="sidebar-logo-icon">🔥</div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">الرايق ERP</div>
            <div className="sidebar-logo-subtitle">المقاولات الكهروميكانيكية</div>
          </div>
        </div>
        {onClose && (
          <button 
            className="sidebar-close-btn" 
            onClick={onClose} 
            style={{ 
              display: 'none', 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-primary)', 
              fontSize: '1.25rem', 
              cursor: 'pointer' 
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((section) => {
          const visibleItems = section.items.filter(item => allowedHrefs.includes(item.href));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.section}>
              <div className="sidebar-section-title">{section.section}</div>
              {visibleItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{
          padding: '0.75rem',
          background: 'rgba(59,130,246,0.08)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(59,130,246,0.15)',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            الترخيص: {role === 'admin' ? 'كامل الصلاحيات' : role === 'manager' ? 'مدير عام' : 'محدد الصلاحية'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            الرايق للمقاولات
          </div>
        </div>
      </div>
    </aside>
  );
}
