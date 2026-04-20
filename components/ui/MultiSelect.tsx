import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder = 'Select...', label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleOption = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{label}</label>}
      <div
        className="input-style w-full cursor-pointer flex justify-between items-center min-h-[42px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1">
          {selected.length === 0 ? (
            <span className="text-[rgb(var(--color-text-muted))]">{placeholder}</span>
          ) : (
            selected.length <= 3 ? (
                selected.map(item => (
                <span key={item} className="bg-sky-100 text-sky-800 text-xs px-2 py-1 rounded-full truncate max-w-[100px]">
                    {item}
                </span>
                ))
            ) : (
                 <span className="bg-sky-100 text-sky-800 text-xs px-2 py-1 rounded-full">
                    {selected.length} محدد
                </span>
            )
          )}
        </div>
        <i className={`fas fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''} text-[rgb(var(--color-text-muted))]`}></i>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[rgb(var(--color-card))] border border-[rgb(var(--color-border))] rounded-md shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
             <div className="p-2 text-sm text-[rgb(var(--color-text-muted))]">لا توجد خيارات</div>
          ) : (
              options.map(option => (
                <div
                  key={option}
                  className="flex items-center px-4 py-2 hover:bg-[rgb(var(--color-card-hover))] cursor-pointer"
                  onClick={() => toggleOption(option)}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => {}}
                    className="ltr:mr-2 rtl:ml-2 h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-[rgb(var(--color-text-base))]">{option}</span>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
};
