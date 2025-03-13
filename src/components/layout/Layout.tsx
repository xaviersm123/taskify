import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sidebarWidth = 'w-64';
  const collapsedWidth = 'w-0';
  const location = useLocation();

  const isProjectBoard = location.pathname.includes('/projects/');

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      <TopBar
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isSidebarCollapsed={isSidebarCollapsed}
      />
      <div className="flex flex-1 overflow-hidden">
        <div
          className={`bg-gray-900 text-white transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? collapsedWidth : sidebarWidth
          } flex-shrink-0`}
        >
          <Sidebar isCollapsed={isSidebarCollapsed} />
        </div>
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
          <main className={`flex-1 ${isProjectBoard ? 'overflow-hidden' : 'overflow-auto'}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};