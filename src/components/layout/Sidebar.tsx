import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  CheckSquare, 
  Inbox, 
  BarChart2, 
  Briefcase,
  Target,
  Bell
} from 'lucide-react';
import { SidebarProjects } from './SidebarProjects';
import { useNotificationStore } from '../../lib/store/notification';

interface SidebarProps {
  isCollapsed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const { unreadCount } = useNotificationStore();

  return (
    <div
      className={`flex flex-col h-full min-h-0 ${
        isCollapsed ? 'w-0 overflow-hidden' : 'w-full'
      } transition-all duration-300 ease-in-out bg-gray-900 text-white`} // Changed w-64 to w-full to fill parent container
    >
      <div className="flex flex-col h-full">
        {/* Navigation Links */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="mt-2 flex-1 px-2 space-y-1">
            <SidebarLink to="/home" icon={Home}>Home</SidebarLink>
            <SidebarLink to="/tasks" icon={CheckSquare}>My Tasks</SidebarLink>
            <SidebarLink to="/inbox" icon={Inbox} badge={unreadCount}>Inbox</SidebarLink>
            
            <div className="pt-4">
              <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Insights
              </div>
              <SidebarLink to="/reporting" icon={BarChart2}>Reporting</SidebarLink>
              <SidebarLink to="/portfolios" icon={Briefcase}>Portfolios</SidebarLink>
              <SidebarLink to="/goals" icon={Target}>Goals</SidebarLink>
            </div>

            <SidebarProjects />
          </nav>
        </div>

        {/* Footer Section */}
        <div className="p-4 border-t border-gray-700">
          <button className="flex items-center text-sm text-gray-400 hover:text-gray-200">
            <Bell className="mr-2 h-5 w-5" />
            Invite Teammates
          </button>
        </div>
      </div>
    </div>
  );
};

interface SidebarLinkProps {
  to: string;
  icon: React.FC<{ className?: string }>;
  children: React.ReactNode;
  badge?: number;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon: Icon, children, badge }) => (
  <Link
    to={to}
    className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:text-white"
  >
    <Icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300" />
    <span className="flex-1">{children}</span>
    {badge !== undefined && badge > 0 && (
      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white">
        {badge}
      </span>
    )}
  </Link>
);