'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { bootstrapSchema } from '@complyfood/shared';
import { getApiUrl, setAuthToken } from '../../../lib/api';

const STEPS = [
  { id: 1, title: 'Account', description: 'Create your organization and admin user' },
  { id: 2, title: 'Documents', description: 'Upload your HACCP manual and documents' },
  { id: 3, title: 'Camera', description: 'Wire a phone for camera acquisition' },
  { id: 4, title: 'Settings', description: 'Review other configuration options' },
] as const;

const inputClass =
  'mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/20';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationAddress, setOrganizationAddress] = useState('');
  const [organizationCategory, setOrganizationCategory] = useState('restaurant');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createAccount = async (e: React.FormEvent) => {
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
      setStep(2);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Set up ComplyFood</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A quick guided setup. Only the account step runs now — the rest previews what&apos;s coming.
        </p>
      </div>

      <ol className="mb-8 flex items-center gap-2" aria-label="Setup progress">
        {STEPS.map((s, index) => {
          const state = s.id < step ? 'complete' : s.id === step ? 'current' : 'upcoming';
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                    state === 'complete'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : state === 'current'
                        ? 'border-primary text-primary'
                        : 'border-border text-muted-foreground'
                  }`}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  {state === 'complete' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                  ) : (
                    s.id
                  )}
                </span>
                <span
                  className={`hidden text-sm font-medium sm:block ${
                    state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <span
                  className={`h-px flex-1 ${s.id < step ? 'bg-primary' : 'bg-border'}`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={createAccount} className="space-y-4">
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
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account & continue'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Back to login
          </button>
        </form>
      )}

      {step === 2 && (
        <WizardStep
          title="Documents & manual upload"
          intro="Add your HACCP manual and supporting documents so they are ready for audits. You can complete this later from the Documents area."
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        >
          <div className="rounded-lg border border-dashed border-input bg-muted/40 p-6 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted-foreground" aria-hidden="true">
              <path d="M12 3v12" />
              <path d="m7 8 5-5 5 5" />
              <path d="M5 21h14a2 2 0 0 0 2-2v-4" />
            </svg>
            <p className="mt-2 text-sm font-medium text-foreground">Drag & drop documents</p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, or images · available after setup</p>
            <span className="mt-3 inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              Coming soon
            </span>
          </div>
        </WizardStep>
      )}

      {step === 3 && (
        <WizardStep
          title="Phone wiring for camera acquisition"
          intro="Connect a phone to capture temperature readings by camera. This acquisition method is optional and not yet operational."
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        >
          <fieldset className="space-y-3" disabled>
            <label className="flex cursor-not-allowed items-start gap-3 rounded-lg border border-input bg-card p-4 opacity-80">
              <input type="radio" name="acquisition" defaultChecked className="mt-1" readOnly />
              <span>
                <span className="block text-sm font-medium text-foreground">Manual entry</span>
                <span className="block text-xs text-muted-foreground">Staff type readings directly. Active by default.</span>
              </span>
            </label>
            <label className="flex cursor-not-allowed items-start gap-3 rounded-lg border border-dashed border-input bg-muted/40 p-4 opacity-80">
              <input type="radio" name="acquisition" className="mt-1" readOnly />
              <span>
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  Phone camera acquisition
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    Coming soon
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  Scan a display with a paired phone and confirm the value before saving.
                </span>
              </span>
            </label>
          </fieldset>
        </WizardStep>
      )}

      {step === 4 && (
        <WizardStep
          title="Other settings"
          intro="Fine-tune reminders, locations, language, and automation from Settings once you are in. Nothing here is required to get started."
          onBack={() => setStep(3)}
          onNext={() => router.push('/dashboard')}
          nextLabel="Finish & go to dashboard"
        >
          <ul className="space-y-2 text-sm">
            {['Reminder schedules', 'Locations & units', 'Language & localization', 'Automation presets'].map((item) => (
              <li key={item} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5">
                <span className="text-foreground">{item}</span>
                <span className="text-xs text-muted-foreground">Configurable in Settings</span>
              </li>
            ))}
          </ul>
        </WizardStep>
      )}
    </div>
  );
}

function WizardStep({
  title,
  intro,
  children,
  onBack,
  onNext,
  nextLabel = 'Continue',
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
      </div>
      {children}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-input px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
