'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: string;
}

export default function AppLayout({ children, title, subtitle, icon }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
