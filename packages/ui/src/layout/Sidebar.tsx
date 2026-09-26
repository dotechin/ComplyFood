import React from 'react';

type IconProps = { className?: string };

const Icon = ({ path, className }: { path: React.ReactNode; className?: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {path}
  </svg>
);

const icons = {
  dashboard: (p: IconProps) => <Icon {...p} path={<><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></>} />,
  logs: (p: IconProps) => <Icon {...p} path={<><path d="M8 2v4M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>} />,
  checklists: (p: IconProps) => <Icon {...p} path={<><path d="M11 12H3M16 6H3M16 18H3M18 9l3 3-3 3" /></>} />,
  supermode: (p: IconProps) => <Icon {...p} path={<><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></>} />,
  reports: (p: IconProps) => <Icon {...p} path={<><path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" /></>} />,
  documents: (p: IconProps) => <Icon {...p} path={<><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /></>} />,
  manual: (p: IconProps) => <Icon {...p} path={<><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></>} />,
  compliance: (p: IconProps) => <Icon {...p} path={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>} />,
  settings: (p: IconProps) => <Icon {...p} path={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>} />,
} as const;

const NAV_ITEMS: { href: string; label: string; icon: keyof typeof icons }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/logs', label: 'Daily Logs', icon: 'logs' },
  { href: '/checklists', label: 'Checklists', icon: 'checklists' },
  { href: '/reports', label: 'Reports', icon: 'reports' },
  { href: '/documents', label: 'Documents', icon: 'documents' },
  { href: '/manual', label: 'HACCP Manual', icon: 'manual' },
  { href: '/compliance', label: 'EU Compliance', icon: 'compliance' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

const DEV_NAV_ITEMS: { href: string; label: string; icon: keyof typeof icons }[] = [
  { href: '/supermode', label: 'Supermode', icon: 'supermode' },
];

export function Sidebar({ pathname }: { pathname?: string }) {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-sidebar">
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2 4 6v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-4Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <span className="text-base font-semibold tracking-tight text-sidebar-foreground">ComplyFood</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
          Operations
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const IconCmp = icons[item.icon];
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sidebar-active-bg text-sidebar-active'
                      : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-active'
                  }`}
                >
                  <IconCmp className={active ? 'text-sidebar-active' : 'text-sidebar-muted group-hover:text-sidebar-active'} />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>

        <p className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
          Development
        </p>
        <ul className="space-y-0.5">
          {DEV_NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const IconCmp = icons[item.icon];
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sidebar-active-bg text-sidebar-active'
                      : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-active'
                  }`}
                >
                  <IconCmp className={active ? 'text-sidebar-active' : 'text-sidebar-muted group-hover:text-sidebar-active'} />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-[11px] leading-relaxed text-sidebar-muted">
          HACCP Compliance Automation
        </p>
      </div>
    </aside>
  );
}
