// ESLint Flat Config for Next.js 16
import eslintConfigNext from "eslint-config-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";

// Custom plugin to prevent var() in className (Tailwind 4 rule)
const noVarInClassName = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow var() in className attribute (Tailwind 4)",
    },
    messages: {
      noVarInClassName:
        'var({{token}}) not allowed in className. Use semantic class instead (e.g., "text-ps-error")',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (
          node.name.name === "className" &&
          node.value?.type === "Literal" &&
          typeof node.value.value === "string"
        ) {
          const match = node.value.value.match(/var\((--ps-[^)]+)\)/);
          if (match) {
            context.report({
              node,
              messageId: "noVarInClassName",
              data: { token: match[1] },
            });
          }
        }
      },
    };
  },
};

const config = [
  ...eslintConfigNext,
  {
    plugins: {
      "@typescript-eslint": tsPlugin,
      prosell: {
        rules: {
          "no-var-in-classname": noVarInClassName,
        },
      },
    },
    rules: {
      // Tailwind 4: Block var() in className
      "prosell/no-var-in-classname": "error",

      // TypeScript: Require description in @ts-expect-error
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
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
