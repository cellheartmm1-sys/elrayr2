'use client';

import Sidebar from './Sidebar';
import Header from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: string;
}

export default function AppLayout({ children, title, subtitle, icon }: AppLayoutProps) {
  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Header title={title} subtitle={subtitle} icon={icon} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
