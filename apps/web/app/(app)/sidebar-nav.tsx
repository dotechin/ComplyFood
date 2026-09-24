'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@complyfood/ui';

export function SidebarNav() {
  const pathname = usePathname();
  return <Sidebar pathname={pathname ?? undefined} />;
}
