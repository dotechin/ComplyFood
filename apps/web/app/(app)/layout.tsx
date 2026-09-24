import { Sidebar } from '@complyfood/ui';
import { LogoutButton } from './logout-button';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="mb-6 flex items-center justify-end">
          <LogoutButton />
        </div>
        {children}
      </main>
    </div>
  );
}
