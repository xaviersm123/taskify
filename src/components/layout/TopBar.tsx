import React, { useState, useEffect } from 'react';
import { Menu, Search, Bell, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../../lib/store/auth';
import { useTaskStore } from '../../lib/store/task';
import { useNotificationStore } from '../../lib/store/notification'; // Import the notification store
import { SearchResults } from '../search/SearchResults';
import { searchTasksAndSubtasks, SearchResult } from '../../lib/utils/search';
import { useTaskSelection } from '../../hooks/useTaskSelection';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';

interface TopBarProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean; // Optional: Remove if not used
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { user, signOut } = useAuthStore();
  const { tasks, subtasks } = useTaskStore();
  const { unreadCount } = useNotificationStore(); // Destructure unreadCount from the notification store
  const { selectTask } = useTaskSelection();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Handle search with debounced query
  useEffect(() => {
    if (debouncedQuery.trim()) {
      const results = searchTasksAndSubtasks(debouncedQuery, tasks, subtasks);
      setSearchResults(results);
      setIsSearching(true);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [debouncedQuery, tasks, subtasks]);

  // Handle result selection from search
  const handleResultSelect = (result: SearchResult) => {
    if (!result.projectId) {
      console.error('Project ID is missing for the selected result.');
      return;
    }

    const taskId = result.type === 'task' ? result.id : result.parentTaskId;
    if (taskId) {
      selectTask(taskId, result.projectId);
    }

    setIsSearching(false);
    setSearchQuery('');
  };

  // Handle click outside profile menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showProfileMenu &&
        event.target &&
        !(event.target as HTMLElement).closest('.profile-menu')
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left Section: Sidebar Toggle and Search Bar */}
          <div className="flex-1 flex items-center">
            {/* Sidebar Toggle Button */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>

            {/* App Name */}
            <span className="text-xl font-bold ml-3">Taskify</span>

            {/* Search Bar */}
            <div className="max-w-2xl w-full lg:max-w-xs ml-8 relative">
              <label htmlFor="search" className="sr-only">
                Search
              </label>
              <div className="relative text-gray-400 focus-within:text-gray-600">
                {/* Search Icon */}
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>

                {/* Search Input */}
                <input
                  id="search"
                  className="block w-full bg-white py-2 pl-10 pr-3 border border-gray-300 rounded-lg leading-5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  style={{ paddingLeft: '2.5rem' }} // Add this line to enforce padding
                  placeholder="Search tasks..."
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearching(true)}
                  autoComplete="off"
                />
              </div>

              {/* Search Results Dropdown */}
              {isSearching && (
                <SearchResults
                  results={searchResults}
                  onSelect={handleResultSelect}
                  onClose={() => {
                    setIsSearching(false);
                    setSearchQuery('');
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Section: Notifications and Profile Menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications Button */}
            <button className="relative p-1 text-gray-400 hover:text-gray-500" aria-label="Notifications">
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Profile Menu */}
            <div className="relative profile-menu">
              {/* Profile Button */}
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                aria-label="Open profile menu"
              >
                {/* Profile Icon */}
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-600">
                    {user?.user_metadata?.firstName?.[0].toUpperCase()}
                  </span>
                </div>

                {/* Username */}
                <span className="text-sm font-medium text-gray-700">
                  {user?.user_metadata?.firstName.split('@')[0]}
                </span>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  {/* Profile Settings */}
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowProfileMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Profile Settings
                  </button>

                  {/* Sign Out */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};