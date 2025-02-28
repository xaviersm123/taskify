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

export const Sidebar = () => {
  const { unreadCount } = useNotificationStore();

  return (
    <div className="flex flex-col w-64 border-r border-gray-200 bg-white h-full">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <nav className="mt-5 flex-1 px-2 space-y-1">
          <SidebarLink to="/home" icon={Home}>Home</SidebarLink>
          <SidebarLink to="/tasks" icon={CheckSquare}>My Tasks</SidebarLink>
          <SidebarLink to="/inbox" icon={Inbox} badge={unreadCount}>Inbox</SidebarLink>
          
          <div className="pt-4">
            <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Insights
            </div>
            <SidebarLink to="/reporting" icon={BarChart2}>Reporting</SidebarLink>
            <SidebarLink to="/portfolios" icon={Briefcase}>Portfolios</SidebarLink>
            <SidebarLink to="/goals" icon={Target}>Goals</SidebarLink>
          </div>

          <SidebarProjects />
        </nav>
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
    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
  >
    <Icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
    <span className="flex-1">{children}</span>
    {badge !== undefined && badge > 0 && (
      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
        {badge}
      </span>
    )}
  </Link>
);