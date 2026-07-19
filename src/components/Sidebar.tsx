'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    section: 'الرئيسية',
    items: [
      { href: '/dashboard', label: 'لوحة التحكم', icon: '📊', module: 'dashboard' },
    ],
  },
  {
    section: 'إدارة الأعمال',
    items: [
      { href: '/projects', label: 'المشاريع', icon: '🏗️', module: 'projects' },
      { href: '/proposals', label: 'العروض الفنية والمالية', icon: '📑', module: 'proposals', adminOnly: true },
      { href: '/estimation', label: 'الهندسة والتسعير', icon: '📐', module: 'estimation' },
      { href: '/procurement', label: 'المشتريات والمخازن', icon: '📦', module: 'procurement' },
    ],
  },
  {
    section: 'العمليات',
    items: [
      { href: '/subcontractors', label: 'مقاولو الباطن', icon: '🤝', module: 'subcontractors' },
      { href: '/labor', label: 'العمالة اليومية', icon: '👷', module: 'labor' },
      { href: '/maintenance', label: 'الصيانة والتشغيل', icon: '🔧', module: 'maintenance' },
    ],
  },
  {
    section: 'المالية والموارد',
    items: [
      { href: '/finance', label: 'المالية والمستخلصات', icon: '💰', module: 'finance' },
      { href: '/hr', label: 'الموارد البشرية', icon: '👨‍💼', module: 'hr' },
    ],
  },
  {
    section: 'الإدارة',
    items: [
      { href: '/settings', label: 'الإعدادات والصلاحيات', icon: '⚙️', module: 'settings' },
    ],
  },
];

const rolePermissions: Record<string, string[]> = {
  admin: ['/dashboard', '/projects', '/proposals', '/estimation', '/procurement', '/subcontractors', '/labor', '/maintenance', '/finance', '/hr', '/settings'],
  secondary: ['/dashboard', '/projects', '/estimation', '/procurement', '/subcontractors', '/labor', '/maintenance', '/finance', '/hr', '/settings'],
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
  const [allowedHrefs, setAllowedHrefs] = useState<string[]>(rolePermissions['admin']);

  useEffect(() => {
    const storedRole = localStorage.getItem('user_role') || 'admin';
    setRole(storedRole);

    if (storedRole === 'admin') {
      setAllowedHrefs(rolePermissions['admin']);
    } else {
      // Fetch dynamic user permissions
      fetchDynamicPermissions(storedRole);
    }
  }, []);

  const fetchDynamicPermissions = async (currentRole: string) => {
    try {
      const res = await fetch('/api/admin/permissions');
      if (res.ok) {
        const perms = await res.json();
        if (Array.isArray(perms) && perms.length > 0) {
          const allowed = perms
            .filter((p: any) => p.can_view)
            .map((p: any) => `/${p.module}`);
          allowed.push('/dashboard');
          setAllowedHrefs(allowed);
          return;
        }
      }
    } catch (err) {
      console.error(err);
    }
    setAllowedHrefs(rolePermissions[currentRole] || rolePermissions['admin']);
  };

  // Automatically close sidebar on route change on mobile
  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '80%' }}>
          <img src="/logo.jpg" alt="Alrayq Logo" style={{ width: '100%', maxHeight: '42px', objectFit: 'contain', borderRadius: '4px' }} />
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
          background: role === 'admin' ? 'rgba(16,185,129,0.08)' : 'rgba(59,130,246,0.08)',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${role === 'admin' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)'}`,
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            الترخيص: {role === 'admin' ? 'المستخدم الأول (كامل الصلاحيات)' : 'المستخدم الثاني (صلاحيات وموافقات)'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            الرايق للمقاولات الكهروميكانيكية
          </div>
        </div>
      </div>
    </aside>
  );
}
