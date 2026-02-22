/**
 * Dynamic icon components for bundle optimization
 *
 * These components are loaded on demand to reduce initial bundle size.
 * Icons that are not immediately needed (like OAuth provider icons)
 * should use these dynamic versions.
 *
 * CLIENT COMPONENT - Required for ssr: false dynamic imports
 */
"use client";

import dynamic from "next/dynamic";

// Dynamically load Google icon - not critical for initial page load
export const GoogleIcon = dynamic(
  () => import("./index").then((mod) => mod.GoogleIcon),
  {
    ssr: false,
    loading: () => (
      <svg
        className="w-5 h-5"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.5 }}
      >
        <rect x="2" y="2" width="14" height="14" rx="2" fill="#e0e0e0" />
      </svg>
    ),
  },
);

// Dynamically load Facebook icon - not critical for initial page load
export const FacebookIcon = dynamic(
  () => import("./index").then((mod) => mod.FacebookIcon),
  {
    ssr: false,
    loading: () => (
      <svg
        className="w-5 h-5"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.5 }}
      >
        <rect x="2" y="2" width="14" height="14" rx="2" fill="#e0e0e0" />
      </svg>
    ),
  },
);

// Email icon is often used, so keep it synchronous
export const EmailIcon = dynamic(
  () => import("./index").then((mod) => mod.EmailIcon),
  {
    loading: () => (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        style={{ opacity: 0.5 }}
      >
        <rect
          x="3"
          y="8"
          width="18"
          height="12"
          rx="2"
          fill="currentColor"
          opacity="0.2"
        />
      </svg>
    ),
  },
);

// Check icon is often used, so keep it synchronous
export const CheckIcon = dynamic(
  () => import("./index").then((mod) => mod.CheckIcon),
  {
    loading: () => (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        style={{ opacity: 0.5 }}
      >
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
      </svg>
    ),
  },
);

// Alert icon is often used, so keep it synchronous
export const AlertIcon = dynamic(
  () => import("./index").then((mod) => mod.AlertIcon),
  {
    loading: () => (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        style={{ opacity: 0.5 }}
      >
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
      </svg>
    ),
  },
);

// X icon is often used, so keep it synchronous
export const XIcon = dynamic(() => import("./index").then((mod) => mod.XIcon), {
  loading: () => (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      style={{ opacity: 0.5 }}
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        fill="currentColor"
        opacity="0.2"
      />
    </svg>
  ),
});

// Shield icon is often used for 2FA, so keep it synchronous
export const ShieldIcon = dynamic(
  () => import("./index").then((mod) => mod.ShieldIcon),
  {
    loading: () => (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        style={{ opacity: 0.5 }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 22s8-4 8-10V5l-8-3v7c0 6 8 10 8 10z"
          fill="currentColor"
          opacity="0.2"
        />
      </svg>
    ),
  },
);
