/**
 * Reusable SVG icon components
 *
 * Extracted from inline SVGs for better maintainability.
 */

import type { CSSProperties } from "react";

export interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
}

/**
 * Google "G" logo icon
 */
export function GoogleIcon({ className, width = 18, height = 18 }: IconProps) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4773 7.37318C17.3133 6.42455 16.8091 5.56182 16.0286 4.86818C15.2573 4.18273 14.2455 3.64273 13.0886 3.38636C12.1641 3.18591 11.3295 3.28591 10.6323 3.48273C9.68545 3.29591 8.68136 3.66409 8.06409 4.36818C7.44591 5.07318 7.14045 5.98909 7.08545 6.95318C6.98045 8.33364 7.24682 9.65727 7.83591 10.7886C8.42136 11.9136 9.30955 12.6295 10.3532 12.7223C11.1977 12.7959 11.9745 12.4436 12.6923 11.7073C13.4095 10.9718 13.7809 9.75364 13.7459 8.41318C13.7459 8.41318 13.7459 8.41318 13.7459 8.41318Z"
        fill="#4285F4"
      />
      <path
        d="M9.00018 17.64C10.5756 17.64 11.9545 17.0818 12.9464 16.2255L12.9464 16.2255L7.83545 12.6923L7.83545 12.6923C8.82545 13.5468 9.00018 13.7459 9.00018 13.7459L9.00018 13.7459L9.00018 13.7459C9.00018 13.7459 9.00018 13.7459 9.00018 13.7459Z"
        fill="#34A853"
      />
      <path
        d="M12.9464 16.2255L12.9464 16.2255L13.3827 12.6923L13.3827 12.6923C13.6032 12.2395 13.7459 11.7959 13.7459 11.3795L13.7459 8.41318L9.00018 8.41318C8.69364 9.11955 8.54318 9.86227 8.54318 10.6295C8.54318 11.3968 8.69364 12.1395 9.00018 12.6923L12.9464 16.2255Z"
        fill="#FBBC05"
      />
      <path
        d="M9.00018 5.31091V12.6923H12.9464C12.9464 11.3418 12.4768 10.0655 11.6695 9.08455C10.8618 8.10364 9.83409 7.45682 8.69045 7.23182C7.975 7.10864 7.24409 7.15955 6.54591 7.37318C7.49773 6.97909 8.43864 6.63909 9.00018 6.29818V5.31091H9.00018Z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * Facebook f logo icon
 */
export function FacebookIcon({
  className,
  width = 18,
  height = 18,
}: IconProps) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 9C18 13.9706 13.9706 18 9 18C4.02944 18 0 13.9706 0 9C0 4.02944 4.02944 0 9 0C13.9706 0 18 4.02944 18 9Z"
        fill="#1877F2"
      />
      <path
        d="M12.5445 14.0625L13.2094 9H14.0625V8.15625H12.9375V6.84375C12.9375 6.15625 13.2669 5.53125 14.375 5.53125H15.9375V4.21875H13.2094C11.4819 4.21875 10.625 5.25219 10.625 6.84375V8.15625H9.375V9H10.625V14.0625H12.5445Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Email icon (for success messages)
 */
export function EmailIcon({ className, width = 24, height = 24 }: IconProps) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

/**
 * Check icon (for success messages)
 */
export function CheckIcon({ className, width = 24, height = 24 }: IconProps) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Alert/Warning icon
 */
export function AlertIcon({ className, width = 24, height = 24 }: IconProps) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/**
 * X icon (for errors)
 */
export function XIcon({ className, width = 24, height = 24 }: IconProps) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/**
 * Shield icon (for 2FA security)
 */
export function ShieldIcon({ className, width = 24, height = 24, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 22s8-4 8-10V5l-8-3v7c0 6 8 10 8 10z"
      />
    </svg>
  );
}
