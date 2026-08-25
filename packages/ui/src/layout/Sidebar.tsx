'use client';

import React from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/logs', label: 'Daily Logs', icon: '📋' },
  { href: '/checklists', label: 'Checklists', icon: '✅' },
  { href: '/overrides', label: 'Overrides', icon: '🔄' },
  { href: '/reports', label: 'Reports', icon: '📊' },
  { href: '/documents', label: 'Documents', icon: '📁' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4">
        <span className="text-lg font-bold text-blue-700">ComplyFood</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
