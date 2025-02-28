import { ReactNode } from 'react';

interface TaskFieldProps {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function TaskField({ label, icon, children, className = '' }: TaskFieldProps) {
  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <div className="flex items-center space-x-2 min-w-[120px]">
        {icon}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}