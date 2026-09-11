import { ResetPasswordForm } from './reset-password-form';

type SearchParams = {
  token?: string | string[];
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const token = Array.isArray(resolvedSearchParams?.token)
    ? resolvedSearchParams.token[0] ?? ''
    : resolvedSearchParams?.token ?? '';

  return <ResetPasswordForm initialToken={token} />;
}
