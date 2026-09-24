'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { passwordResetConfirmSchema } from '@complyfood/shared';
import { getApiUrl } from '../../../lib/api';

export function ResetPasswordForm({ initialToken }: { initialToken: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const result = passwordResetConfirmSchema.safeParse({ token: initialToken, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/auth/password-reset/confirm'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Unable to reset password');
        return;
      }
      setMessage(data.message);
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-blue-700">Set a new password</h1>
        <p className="mt-1 text-sm text-gray-500">Use your reset link to set a fresh password</p>
      </div>
      {!initialToken && <p className="mb-4 text-xs text-red-600">Missing reset token.</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {message && <p className="text-xs text-green-600">{message}</p>}
        <button
          type="submit"
          disabled={loading || !initialToken}
          className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
