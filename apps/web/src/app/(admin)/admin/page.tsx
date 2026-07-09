import { redirect } from "next/navigation";

/**
 * Redirect /admin to /admin/organizations.
 *
 * Next.js RSC prefetches parent routes when navigating to child routes.
 * Without a page here, /admin returns 404 (only layout exists). This
 * redirect catches direct access and RSC prefetch requests.
 */
export default function AdminIndexPage() {
  redirect("/admin/organizations");
}
