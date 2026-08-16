/**
 * Design Tokens - Single source of truth para colores, espaciado, tamaños.
 * Todos los componentes DEBEN usar estos tokens en vez de hardcodear valores.
 *
 * Basado en shadcn/ui patterns pero adaptado a ProSell brand.
 */

/**
 * Color tokens - Usar ESTOS en vez de hardcodear tailwind classes.
 * Ejemplo: En vez de "bg-blue-600", usar COLORS.primary.base
 */
export const COLORS = {
  // Primary brand color (ProSell blue)
  primary: {
    lighter: "bg-blue-50 dark:bg-blue-950",
    light: "bg-blue-100 dark:bg-blue-900",
    base: "bg-blue-600 dark:bg-blue-500",
    dark: "bg-blue-700 dark:bg-blue-400",
    darker: "bg-blue-800 dark:bg-blue-300",
  },

  // Status colors
  status: {
    pending: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      text: "text-yellow-700 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-800",
    },
    active: {
      bg: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-400",
      border: "border-green-200 dark:border-green-800",
    },
    rejected: {
      bg: "bg-red-50 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-400",
      border: "border-red-200 dark:border-red-800",
    },
    revoked: {
      bg: "bg-gray-50 dark:bg-gray-900/20",
      text: "text-gray-700 dark:text-gray-400",
      border: "border-gray-200 dark:border-gray-800",
    },
  },

  // Semantic colors
  destructive: {
    bg: "bg-red-600 dark:bg-red-500",
    hover: "hover:bg-red-700 dark:hover:bg-red-400",
    text: "text-white",
  },

  success: {
    bg: "bg-green-600 dark:bg-green-500",
    hover: "hover:bg-green-700 dark:hover:bg-green-400",
    text: "text-white",
  },

  // Neutral (grays)
  neutral: {
    bg: "bg-gray-100 dark:bg-gray-800",
    border: "border-gray-200 dark:border-gray-700",
    text: "text-gray-900 dark:text-white",
    textMuted: "text-gray-500 dark:text-gray-400",
  },
} as const;

/**
 * Spacing tokens - Consistencia en padding/margin/gap
 */
export const SPACING = {
  card: {
    padding: "p-6",
    gap: "space-y-4",
  },
  form: {
    fieldGap: "space-y-2",
    sectionGap: "space-y-6",
  },
  layout: {
    containerPadding: "px-4 sm:px-6 lg:px-8",
    sectionGap: "space-y-8",
  },
} as const;

/**
 * Typography tokens
 */
export const TYPOGRAPHY = {
  heading: {
    h1: "text-3xl font-bold tracking-tight",
    h2: "text-2xl font-bold tracking-tight",
    h3: "text-xl font-semibold",
    h4: "text-lg font-semibold",
  },
  body: {
    base: "text-base",
    sm: "text-sm",
    xs: "text-xs",
  },
} as const;

/**
 * Component variants - Reusable component styles
 */
export const VARIANTS = {
  badge: {
    base: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
    pending: `${COLORS.status.pending.bg} ${COLORS.status.pending.text} ${COLORS.status.pending.border}`,
    active: `${COLORS.status.active.bg} ${COLORS.status.active.text} ${COLORS.status.active.border}`,
    rejected: `${COLORS.status.rejected.bg} ${COLORS.status.rejected.text} ${COLORS.status.rejected.border}`,
    revoked: `${COLORS.status.revoked.bg} ${COLORS.status.revoked.text} ${COLORS.status.revoked.border}`,
  },

  card: {
    base: "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
    hover: "hover:border-gray-300 dark:hover:border-gray-600 transition-colors",
  },

  button: {
    primary: `${COLORS.primary.base} ${COLORS.primary.dark} text-white`,
    destructive: `${COLORS.destructive.bg} ${COLORS.destructive.hover} ${COLORS.destructive.text}`,
    outline: `border ${COLORS.neutral.border} ${COLORS.neutral.text} hover:bg-gray-50 dark:hover:bg-gray-800`,
  },
} as const;
