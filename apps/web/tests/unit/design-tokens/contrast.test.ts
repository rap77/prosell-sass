import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * A11y guard: every text design token must meet WCAG 2.1 AA contrast (>= 4.5:1)
 * against the surface tokens it is rendered on, in EVERY theme block.
 *
 * `--ps-text-disabled` is intentionally exempt: per WCAG 1.4.3, text that is
 * part of an inactive/disabled UI control has no contrast requirement. It must
 * ONLY be used for disabled controls (e.g. paginated buttons in LeadList).
 *
 * This test exists so the systemic regression fixed in fix/a11y-text-tertiary-token
 * (the misnamed `--ps-text-disabled` used as body text at ~2.3:1) can never return.
 */

const WCAG_AA_NORMAL = 4.5;
const EXEMPT_TEXT_TOKENS = new Set(["--ps-text-disabled"]);
const BACKGROUND_TOKENS = [
  "--ps-bg-base",
  "--ps-bg-surface",
  "--ps-bg-sidebar",
] as const;

const cssPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../src/app/globals.css",
);

function channelToLinear(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

interface ThemeBlock {
  selector: string;
  tokens: Map<string, string>;
}

/** Parse top-level `selector { ... }` blocks, keeping only hex-valued CSS vars. */
function parseThemeBlocks(css: string): ThemeBlock[] {
  const blocks: ThemeBlock[] = [];
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  const varRe = /(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(css)) !== null) {
    const selector = match[1].trim();
    const body = match[2];
    const tokens = new Map<string, string>();
    let varMatch: RegExpExecArray | null;
    while ((varMatch = varRe.exec(body)) !== null) {
      tokens.set(varMatch[1], varMatch[2]);
    }
    if (tokens.size > 0) blocks.push({ selector, tokens });
  }
  return blocks;
}

const css = readFileSync(cssPath, "utf8");
const blocks = parseThemeBlocks(css);

// Only blocks that define both text tokens and at least one background token
// are themeable surfaces we must validate.
const themeBlocks = blocks.filter((b) => {
  const hasText = [...b.tokens.keys()].some((k) => k.startsWith("--ps-text-"));
  const hasBg = BACKGROUND_TOKENS.some((bg) => b.tokens.has(bg));
  return hasText && hasBg;
});

describe("globals.css text token contrast (WCAG AA)", () => {
  it("discovers themeable blocks to validate", () => {
    expect(themeBlocks.length).toBeGreaterThan(0);
  });

  for (const block of themeBlocks) {
    const textTokens = [...block.tokens.entries()].filter(
      ([name]) =>
        name.startsWith("--ps-text-") && !EXEMPT_TEXT_TOKENS.has(name),
    );
    const backgrounds = BACKGROUND_TOKENS.filter((bg) => block.tokens.has(bg));

    for (const [textName, textHex] of textTokens) {
      for (const bg of backgrounds) {
        const bgHex = block.tokens.get(bg)!;
        it(`[${block.selector}] ${textName} on ${bg} meets AA`, () => {
          const ratio = contrastRatio(textHex, bgHex);
          expect(
            ratio,
            `${textName} (${textHex}) on ${bg} (${bgHex}) = ${ratio.toFixed(2)}:1, below AA ${WCAG_AA_NORMAL}:1`,
          ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
        });
      }
    }
  }
});
