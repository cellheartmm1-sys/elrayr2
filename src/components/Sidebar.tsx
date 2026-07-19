'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface SubItem {
  href: string;
  label: string;
  icon: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  module: string;
  adminOnly?: boolean;
  subItems?: SubItem[];
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const navItems: NavSection[] = [
  {
    section: 'الرئيسية',
    items: [
      { href: '/dashboard', label: 'لوحة التحكم', icon: '📊', module: 'dashboard' },
      { href: '/dashboard#contact-requests', label: 'طلبات تواصل العملاء', icon: '📩', module: 'contact_requests', adminOnly: true },
    ],
  },
  {
    section: 'إدارة الأعمال والمشاريع',
    items: [
      {
        href: '/projects',
        label: 'المشاريع والتثمين',
        icon: '🏗️',
        module: 'projects',
        subItems: [
          { href: '/projects', label: 'قائمة المشاريع الفعالة', icon: '📊' },
          { href: '/estimation', label: 'الهندسة والتقدير والتثمين', icon: '📐' },
        ],
      },
      {
        href: '/procurement',
        label: 'المشتريات والمخازن',
        icon: '📦',
        module: 'procurement',
        subItems: [
          { href: '/procurement?tab=requests', label: 'طلبات وتوريد المواد', icon: '📝' },
          { href: '/procurement?tab=submittals', label: 'اعتمادات المواد (Submittals)', icon: '📋' },
          { href: '/procurement?tab=warehouses', label: 'إدارة المستودعات والمخازن', icon: '🏢' },
          { href: '/procurement?tab=inventory', label: 'مخازن وجرد المواقع', icon: '📦' },
        ],
      },
    ],
  },
  {
    section: 'العمليات والمالية',
    items: [
      {
        href: '/finance',
        label: 'المالية والمستخلصات',
        icon: '💰',
        module: 'finance',
        subItems: [
          { href: '/finance?tab=ipc', label: 'مستخلصات العميل', icon: '📄' },
          { href: '/finance?tab=expenses', label: 'مصروفات وتكاليف المشاريع', icon: '🧾' },
          { href: '/finance?tab=cashflow', label: 'التدفق النقدي والربحية', icon: '📈' },
          { href: '/finance?tab=debts', label: 'المديونيات وتمويل المشاريع', icon: '🏛️' },
          { href: '/finance?tab=reports', label: 'التقارير المالية والطباعة', icon: '📊' },
        ],
      },
      {
        href: '/subcontractors',
        label: 'مقاولو الباطن',
        icon: '🤝',
        module: 'subcontractors',
        subItems: [
          { href: '/subcontractors?tab=contractors', label: 'قائمة المقاولين', icon: '🏢' },
          { href: '/subcontractors?tab=ipc', label: 'مستخلصات مقاولي الباطن', icon: '📄' },
        ],
      },
      { href: '/labor', label: 'العمالة اليومية', icon: '👷', module: 'labor' },
      {
        href: '/hr',
        label: 'الموارد البشرية والرواتب',
        icon: '👨‍💼',
        module: 'hr',
        subItems: [
          { href: '/hr?tab=employees', label: 'شؤون الموظفين', icon: '👨‍💼' },
          { href: '/hr?tab=payroll', label: 'مسيرات الرواتب وهيكلة الأجور', icon: '💳' },
          { href: '/hr?tab=assets', label: 'العهد والرواتب الموزعة', icon: '🔨' },
          { href: '/hr?tab=attendance', label: 'حضور المواقع (GPS)', icon: '📍' },
          { href: '/hr?tab=loans', label: 'السلفيات والقروض', icon: '💵' },
        ],
      },
      {
        href: '/maintenance',
        label: 'الصيانة والتشغيل',
        icon: '🔧',
        module: 'maintenance',
        subItems: [
          { href: '/maintenance?tab=contracts', label: 'عقود الصيانة', icon: '📜' },
          { href: '/maintenance?tab=tickets', label: 'بلاغات الأعطال', icon: '🎫' },
          { href: '/maintenance?tab=visits', label: 'الزيارات الميدانية', icon: '🚚' },
        ],
      },
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
  admin: ['/dashboard', '/dashboard#contact-requests', '/projects', '/estimation', '/procurement', '/subcontractors', '/labor', '/maintenance', '/finance', '/hr', '/settings'],
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
  const router = useRouter();
  const [role, setRole] = useState('admin');
  const [allowedHrefs, setAllowedHrefs] = useState<string[]>(rolePermissions['admin']);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    const storedRole = localStorage.getItem('user_role') || 'admin';
    setRole(storedRole);

    if (storedRole === 'admin') {
      setAllowedHrefs(rolePermissions['admin']);
    } else {
      fetchDynamicPermissions(storedRole);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.pathname + window.location.search);
    }
  }, [pathname]);

  // Expand matching menu section automatically when navigating
  useEffect(() => {
    navItems.forEach(section => {
      section.items.forEach(item => {
        if (item.subItems && item.subItems.length > 0) {
          const isMatching = pathname === item.href || item.subItems.some(sub => pathname.startsWith(sub.href.split('?')[0]));
          if (isMatching) {
            setOpenMenus(prev => ({ ...prev, [item.href]: true }));
          }
        }
      });
    });
  }, [pathname]);

  const toggleMenu = (href: string) => {
    setOpenMenus(prev => ({ ...prev, [href]: !prev[href] }));
  };

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
                const hasSub = item.subItems && item.subItems.length > 0;
                const isOpen = !!openMenus[item.href];
                const isMainActive = pathname === item.href || (hasSub && item.subItems?.some(s => s.href.split('?')[0] === pathname));

                return (
                  <div key={item.href} style={{ marginBottom: '0.25rem' }}>
                    <div
                      className={`nav-item ${isMainActive ? 'active' : ''}`}
                      onClick={() => {
                        if (hasSub) {
                          toggleMenu(item.href);
                        } else {
                          router.push(item.href);
                        }
                      }}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {hasSub && (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          transition: 'transform 0.2s ease', 
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          opacity: 0.7
                        }}>
                          ▼
                        </span>
                      )}
                    </div>

                    {hasSub && isOpen && (
                      <div className="nav-sub-menu">
                        {item.subItems?.map((sub) => {
                          const isSubActive = currentUrl === sub.href || (pathname === sub.href.split('?')[0] && currentUrl === sub.href);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`nav-sub-item ${isSubActive ? 'active' : ''}`}
                            >
                              <span style={{ fontSize: '0.85rem' }}>{sub.icon}</span>
                              <span>{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
