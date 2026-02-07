/**
 * Verify Email Page
 *
 * Server Component that extracts verification token from URL
 * and delegates to VerifyEmailForm client component.
 */

import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;

  return <VerifyEmailForm token={token} />;
}

// Metadata for SEO
export const metadata = {
  title: "Verify Email - ProSell",
  description: "Verify your email address to complete your registration.",
};
