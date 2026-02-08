/**
 * Forgot Password Page
 *
 * Server Component for password reset request.
 */

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}

// Metadata for SEO
export const metadata = {
  title: "Forgot Password - ProSell",
  description: "Reset your password by entering your email address.",
};
