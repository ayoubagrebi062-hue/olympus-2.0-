// Full component code here...
'use client';

import React, { useState, forwardRef } from 'react';
import { cn } from '../src/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  subMenu?: MenuItem[];
}

interface ProfessionalSidebarProps {
  menuItems: MenuItem[];
  user: {
    name: string;
    avatarUrl: string;
  };
  activeItemId: string;
  onMenuItemClick: (id: string) => void;
}

const ProfessionalSidebar = forwardRef<HTMLDivElement, ProfessionalSidebarProps>(({
  menuItems,
  user,
  activeItemId,
  onMenuItemClick
}, ref) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div
      ref={ref}
      className="bg-[#0a0a0a] bg-white/[0.03] backdrop-blur-xl shadow-[0_0_50px_rgba(124,58,237,0.3)] text-white w-64 h-full flex flex-col p-6"
    >
      <div className="flex items-center mb-6">
        <img src={user.avatarUrl} alt="User Avatar" className="w-12 h-12 rounded-full mr-4" />
        <span className="text-xl font-semibold">{user.name}</span>
      </div>
      <nav>
        {menuItems.map(item => (
          <div key={item.id} className="mb-4">
            <button
              className={cn(
                'flex items-center w-full text-left p-4 rounded-md transition-all duration-200 focus:ring-2 focus:ring-violet-500',
                {
                  'bg-violet-600': activeItemId === item.id,
                  'hover:bg-violet-500': activeItemId !== item.id
                }
              )}
              onClick={() => onMenuItemClick(item.id)}
              aria-expanded={expandedSections.has(item.id)}
              aria-controls={`submenu-${item.id}`}
            >
              <span className="mr-4">{item.icon}</span>
              <span>{item.label}</span>
            </button>
            {item.subMenu && (
              <div
                id={`submenu-${item.id}`}
                className={cn('pl-6', {
                  'hidden': !expandedSections.has(item.id),
                  'block': expandedSections.has(item.id)
                })}
              >
                {item.subMenu.map(subItem => (
                  <button
                    key={subItem.id}
                    className={cn(
                      'flex items-center w-full text-left p-2 rounded-md transition-all duration-200 focus:ring-2 focus:ring-violet-500',
                      {
                        'bg-violet-600': activeItemId === subItem.id,
                        'hover:bg-violet-500': activeItemId !== subItem.id
                      }
                    )}
                    onClick={() => onMenuItemClick(subItem.id)}
                  >
                    <span className="mr-4">{subItem.icon}</span>
                    <span>{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
});

ProfessionalSidebar.displayName = 'ProfessionalSidebar';

export { ProfessionalSidebar };
export type { ProfessionalSidebarProps, MenuItem };