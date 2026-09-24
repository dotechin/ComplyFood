'use client';

import { useRouter } from 'next/navigation';
import { clearAuthToken } from '../../lib/api';

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        clearAuthToken();
        router.push('/login');
        router.refresh();
      }}
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
    >
      Logout
    </button>
  );
}
