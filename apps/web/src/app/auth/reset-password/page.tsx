/**
 * Reset Password Page
 *
 * Server Component that extracts reset token from URL
 * and delegates to ResetPasswordForm client component.
 */

import { ResetPasswordPageContent } from "./ResetPasswordPageContent";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return <ResetPasswordPageContent token={token} />;
}

// Metadata for SEO
export const metadata = {
  title: "Reset Password - ProSell",
  description: "Reset your password with the link from your email.",
};
