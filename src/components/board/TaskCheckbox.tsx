import React from 'react';
import { Check } from 'lucide-react';

interface TaskCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const TaskCheckbox: React.FC<TaskCheckboxProps> = ({ checked, onChange }) => {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors
        ${checked 
          ? 'bg-green-500 border-green-500 hover:bg-green-600 hover:border-green-600' 
          : 'border-gray-300 hover:border-gray-400'
        }`}
    >
      {checked && <Check className="h-3 w-3 text-white" />}
    </button>
  );
};