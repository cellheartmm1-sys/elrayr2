'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: string;
}

export default function AppLayout({ children, title, subtitle, icon }: AppLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (!role) {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  useEffect(() => {
    fetch('/api/settings/active-currency')
      .then(res => res.json())
      .then(data => {
        if (data && data.symbol) {
          localStorage.setItem('system_currency_symbol', data.symbol);
          localStorage.setItem('system_currency_code', data.code);
        }
      })
      .catch(err => console.error('Failed to fetch active currency:', err));
  }, []);

  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0b0f19', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(255,255,255,0.1)', 
            borderTopColor: '#f59e0b', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite', 
            margin: '0 auto 1rem' 
          }} />
          <div>جاري التحقق من الهوية...</div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin { to { transform: rotate(360deg); } }
        ` }} />
      </div>
    );
  }

  return (
    <div className="layout-wrapper">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Semi-transparent dark overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(2, 6, 23, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 99,
            transition: 'opacity 0.25s ease'
          }}
        />
      )}

      <div className="main-content">
        <Header 
          title={title} 
          subtitle={subtitle} 
          icon={icon} 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
        />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
