import { Sidebar } from '@complyfood/ui';
import { LogoutButton } from './logout-button';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex h-2 w-2 rounded-full bg-success" aria-hidden="true" />
            <span>Demo Restaurant</span>
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
