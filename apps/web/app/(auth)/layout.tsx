export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel (signature deep-green) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2 4 6v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-4Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">ComplyFood</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white">
            Food-safety compliance, on autopilot.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-sidebar-foreground">
            Generate HACCP logs, run daily checklists, and keep an audit-ready trail — without the paperwork.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-sidebar-foreground">
            {['Automated daily log generation', 'Real-time reminders & overrides', 'One-click audit reports'].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary-foreground">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--sidebar-active))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-sidebar-muted">© {new Date().getFullYear()} ComplyFood. HACCP Compliance Automation.</p>
      </div>

      {/* Form side */}
      <div className="flex w-full items-center justify-center bg-background px-6 py-12 lg:w-1/2">
        {children}
      </div>
    </div>
  );
}
