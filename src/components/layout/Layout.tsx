import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sidebarWidth = 'w-64'; // 256px width for the sidebar
  const collapsedWidth = 'w-0'; // Collapsed sidebar takes no width

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      {/* Fixed TopBar that spans the full width */}
      <TopBar
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Container for Sidebar and Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`bg-gray-900 text-white transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? collapsedWidth : sidebarWidth
          } flex-shrink-0`} // Added flex-shrink-0 to prevent sidebar from shrinking
        >
          <Sidebar isCollapsed={isSidebarCollapsed} />
        </div>

        {/* Main content area (adjusts width based on sidebar) */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
          {/* Main content that can scroll */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};