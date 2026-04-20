
import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, actions }) => {
  return (
    <div className="sticky top-0 z-40 bg-[rgb(var(--color-background))] py-4 border-b border-[rgb(var(--color-border))] mb-6 transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="w-full md:w-auto">
            {title}
        </div>
        {actions && <div className="w-full md:w-auto flex justify-end md:justify-start">{actions}</div>}
      </div>
    </div>
  );
};
