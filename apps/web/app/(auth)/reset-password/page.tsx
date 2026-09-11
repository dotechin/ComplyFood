import { ResetPasswordForm } from './reset-password-form';

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { token?: string | string[] };
}) {
  const token = Array.isArray(searchParams?.token)
    ? searchParams?.token[0] ?? ''
    : searchParams?.token ?? '';
  return <ResetPasswordForm initialToken={token} />;
}
