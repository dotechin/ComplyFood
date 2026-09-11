'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { passwordResetRequestSchema } from '@complyfood/shared';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setResetUrl('');
    const result = passwordResetRequestSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Unable to request password reset');
        return;
      }
      setMessage(data.message);
      setResetUrl(getSafeResetUrl(data.resetUrl));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-blue-700">Reset password</h1>
        <p className="mt-1 text-sm text-gray-500">Enter your email to request a reset link</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {message && <p className="text-xs text-green-600">{message}</p>}
        {process.env.NODE_ENV !== 'production' && resetUrl && (
          <a href={resetUrl} className="block text-xs text-blue-600 hover:text-blue-700">
            Open reset link (development only)
          </a>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Request reset'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Back to login
        </button>
      </form>
    </div>
  );
}

function getSafeResetUrl(value: unknown) {
  if (typeof value !== 'string' || !value) {
    return '';
  }

  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname !== '/reset-password') {
      return '';
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return '';
  }
}
