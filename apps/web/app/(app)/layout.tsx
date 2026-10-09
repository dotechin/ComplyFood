import { SidebarNav } from './sidebar-nav';
import { LogoutButton } from './logout-button';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background print:block print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <SidebarNav />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 print:hidden">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex h-2 w-2 rounded-full bg-success" aria-hidden="true" />
            <span>Demo Restaurant</span>
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-8 print:overflow-visible print:px-0 print:py-0">
          <div className="mx-auto w-full max-w-6xl print:max-w-none">{children}</div>
        </main>
      </div>
    </div>
  );
}
