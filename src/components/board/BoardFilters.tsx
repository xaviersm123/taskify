import React from 'react';
import { Filter } from 'lucide-react';
import { useUserStore } from '../../lib/store/user';
import { formatUserDisplay } from '../../lib/utils/user-display';
import { useAuthStore } from '../../lib/store/auth';

export type TaskFilter = {
  incomplete: boolean;
  completed: boolean;
  assignedToMe: boolean;
  dueThisWeek: boolean;
  dueNextWeek: boolean;
  assignee?: string;
};

interface BoardFiltersProps {
  filters: TaskFilter;
  onFilterChange: (filters: TaskFilter) => void;
  onClearFilters: () => void;
}

export const BoardFilters: React.FC<BoardFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { users } = useUserStore();
  const { user } = useAuthStore();

  const hasActiveFilters = Object.values(filters).some(value => Boolean(value));

  const handleCheckboxChange = (key: keyof Omit<TaskFilter, 'assignee'>) => {
    onFilterChange({
      ...filters,
      [key]: !filters[key]
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm ${
          hasActiveFilters 
            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Filter className="h-4 w-4" />
        <span>Filter</span>
        {hasActiveFilters && (
          <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-xs">
            {Object.values(filters).filter(Boolean).length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg z-20 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900">Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={onClearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase">Status</h4>
                <div className="space-y-2">
                  <FilterCheckbox
                    label="Incomplete tasks"
                    checked={filters.incomplete}
                    onChange={() => handleCheckboxChange('incomplete')}
                  />
                  <FilterCheckbox
                    label="Completed tasks"
                    checked={filters.completed}
                    onChange={() => handleCheckboxChange('completed')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase">Assignment</h4>
                <div className="space-y-2">
                  <FilterCheckbox
                    label="Assigned to me"
                    checked={filters.assignedToMe}
                    onChange={() => handleCheckboxChange('assignedToMe')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase">Due Date</h4>
                <div className="space-y-2">
                  <FilterCheckbox
                    label="Due this week"
                    checked={filters.dueThisWeek}
                    onChange={() => handleCheckboxChange('dueThisWeek')}
                  />
                  <FilterCheckbox
                    label="Due next week"
                    checked={filters.dueNextWeek}
                    onChange={() => handleCheckboxChange('dueNextWeek')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase">Assignee</h4>
                <select
                  value={filters.assignee || ''}
                  onChange={e => onFilterChange({ ...filters, assignee: e.target.value || undefined })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Anyone</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {formatUserDisplay(user)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

const FilterCheckbox: React.FC<FilterCheckboxProps> = ({ label, checked, onChange }) => (
  <label className="flex items-center">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
    />
    <span className="ml-2 text-sm text-gray-700">{label}</span>
  </label>
);