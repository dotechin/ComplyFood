import { ResetPasswordForm } from './reset-password-form';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const token = Array.isArray(resolvedSearchParams.token)
    ? resolvedSearchParams.token[0] ?? ''
    : resolvedSearchParams.token ?? '';
  return <ResetPasswordForm initialToken={token} />;
}
