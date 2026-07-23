import type { Config } from "tailwindcss";

/**
 * Tailwind CSS Configuration for ProSell SaaS
 *
 * Color system:
 * - shadcn/ui tokens (primary, secondary, etc.) for component library
 * - ProSell tokens (ps-*) for custom design system elements
 *
 * @see https://tailwindcss.com/docs/configuration
 * @see https://ui.shadcn.com
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // shadcn/ui tokens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ProSell design tokens (--ps-* from globals.css)
        // ponytail: only tokens without shadcn equivalents
        ps: {
          // Backgrounds
          base: "var(--ps-bg-base)",
          surface: "var(--ps-bg-surface)",
          elevated: "var(--ps-bg-elevated)",
          sidebar: "var(--ps-bg-sidebar)",
          // Text
          "text-primary": "var(--ps-text-primary)",
          "text-secondary": "var(--ps-text-secondary)",
          tertiary: "var(--ps-text-tertiary)",
          disabled: "var(--ps-text-disabled)",
          // Status (shadcn lacks success/warning)
          success: "var(--ps-success)",
          warning: "var(--ps-warning)",
          error: "var(--ps-error)",
          "success-bg": "var(--ps-success-bg)",
          "warning-bg": "var(--ps-warning-bg)",
          "error-bg": "var(--ps-error-bg)",
          "info-bg": "var(--ps-info-bg)",
          // Form / inputs
          "input-bg": "var(--ps-input-bg)",
          "input-border": "var(--ps-input-border)",
          // Brand
          cyan: "var(--ps-cyan)",
          "cyan-hover": "var(--ps-cyan-hover)",
          "cyan-faint": "var(--ps-cyan-faint)",
          navy: "var(--ps-navy)",
          blue: "var(--ps-blue)",
          "blue-hover": "var(--ps-blue-hover)",
          // Borders
          "border-subtle": "var(--ps-border-subtle)",
          "border-default": "var(--ps-border-default)",
          "border-medium": "var(--ps-border-medium)",
          "border-strong": "var(--ps-border-strong)",
          "border-active": "var(--ps-border-active)",
          // Component-specific
          badge: "var(--ps-badge-bg)",
          "field-tag-bg": "var(--ps-field-tag-bg)",
          "nav-bg": "var(--ps-nav-bg)",
          "danger-hover-bg": "var(--ps-danger-hover-bg)",
          "danger-hover-border": "var(--ps-danger-hover-border)",
          // Landing decorative
          "landing-glow-1": "var(--ps-landing-glow-1)",
          "landing-glow-2": "var(--ps-landing-glow-2)",
          "landing-grid": "var(--ps-landing-grid)",
          "glass-bg": "var(--ps-glass-bg)",
          "glass-bg-strong": "var(--ps-glass-bg-strong)",
          "metric-bg": "var(--ps-metric-bg)",
          "float-badge-bg": "var(--ps-float-badge-bg)",
          "accent-glow": "var(--ps-accent-glow)",
          "accent-glow-soft": "var(--ps-accent-glow-soft)",
          "accent-glow-medium": "var(--ps-accent-glow-medium)",
          "accent-glow-intense": "var(--ps-accent-glow-intense)",
          // Misc
          violet: "var(--ps-violet)",
          "violet-bg": "var(--ps-violet-bg)",
          whatsapp: "var(--ps-whatsapp)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "input-focus": "0 0 0 3px var(--ps-input-focus-shadow)",
        "input-error": "0 0 0 3px var(--ps-input-error-shadow)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
