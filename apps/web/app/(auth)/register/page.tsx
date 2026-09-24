'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { bootstrapSchema } from '@complyfood/shared';
import { getApiUrl, setAuthToken } from '../../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState('');
  const [organizationAddress, setOrganizationAddress] = useState('');
  const [organizationCategory, setOrganizationCategory] = useState('restaurant');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = bootstrapSchema.safeParse({
      organizationName,
      organizationAddress,
      organizationCategory,
      email,
      password,
    });

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
      const res = await fetch(getApiUrl('/auth/bootstrap'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });

      const data = await res
        .json()
        .catch(() => null as { accessToken?: string; message?: string } | null);
      if (!res.ok) {
        setError(data?.message || 'Unable to create account');
        return;
      }
      if (!data?.accessToken) {
        setError('Unable to create account');
        return;
      }

      setAuthToken(data.accessToken);
      window.location.assign('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2 4 6v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-4Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <span className="text-lg font-semibold tracking-tight text-foreground">ComplyFood</span>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Set up an organization and its first admin user.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="organizationName" className="block text-sm font-medium text-foreground">
              Organization name
            </label>
            <input
              id="organizationName"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div>
            <label htmlFor="organizationCategory" className="block text-sm font-medium text-foreground">
              Business category
            </label>
            <input
              id="organizationCategory"
              value={organizationCategory}
              onChange={(e) => setOrganizationCategory(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div>
            <label htmlFor="organizationAddress" className="block text-sm font-medium text-foreground">
              Address
            </label>
            <input
              id="organizationAddress"
              value={organizationAddress}
              onChange={(e) => setOrganizationAddress(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Admin email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="w-full text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          Back to login
        </button>
      </form>
    </div>
  );
}
