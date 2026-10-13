'use client';

import { useRouter } from 'next/navigation';
import { clearAuthToken } from '../../lib/api';
import { ActionButton, LogoutIcon } from '../../components/icon-button';

export function LogoutButton() {
  const router = useRouter();

  return (
    <ActionButton
      icon={<LogoutIcon />}
      label="Logout"
      onClick={() => {
        clearAuthToken();
        router.push('/login');
        router.refresh();
      }}
    />
  );
}
