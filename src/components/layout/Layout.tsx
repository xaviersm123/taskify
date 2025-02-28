import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar with transition */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${
          isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <Sidebar />
      </div>
      
      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'pl-0' : 'pl-64'
      }`}>
        {/* Fixed top bar */}
        <TopBar 
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        
        {/* Main content that can scroll */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};