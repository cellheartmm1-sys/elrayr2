'use client';

import { useState } from 'react';
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
