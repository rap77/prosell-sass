// ESLint Flat Config for Next.js 16
import eslintConfigNext from "eslint-config-next";

const config = [
  ...eslintConfigNext,
  {
    rules: {
      // Add custom rules here if needed
    },
  },
  {
    ignores: [
      "coverage/**",
      ".next/**",
      "node_modules/**",
      "*.config.js",
      "*.config.mjs",
    ],
  },
];

export default config;
