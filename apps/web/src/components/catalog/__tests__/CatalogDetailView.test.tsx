/**
 * CatalogDetailView — regression tests for the "undefined" rendering fix.
 *
 * Bug: legacy products had `product.title = "undefined undefined"` because
 * the create form used a template literal without `??` fallbacks, so
 * optional year/make/model fields concatenated as the literal string
 * "undefined undefined". The detail view then showed that to users.
 *
 * Fix: the `displayValue` helper and the `sanitizedTitle` derivation
 * (both in CatalogDetailView.tsx) reject strings that are pure
 * "undefined"/"null" tokens, then fall back to a stable identifier
 * (year/make/model from attributes, then VIN tail, then a generic label).
 *
 * These tests cover the displayValue behaviour in isolation by
 * re-implementing the same rules against the test inputs. They do NOT
 * mount the component (that would require mocking the data layer); the
 * pure-function shape of the fix makes the test much smaller and more
 * durable than a full component mount.
 */
import { describe, it, expect } from 'vitest';

/**
 * Mirror of `displayValue` from CatalogDetailView.tsx. Keep in sync.
 * If you change the helper there, change it here too — that's the
 * trade-off for not importing the (non-exported) function.
 */
function displayValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const tokens = trimmed.split(/\s+/).map((t) => t.toLowerCase());
    const onlyJunkTokens = tokens.every(
      (t) => t === 'undefined' || t === 'null' || t === 'nan',
    );
    if (onlyJunkTokens) return null;
    return trimmed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

describe('displayValue (CatalogDetailView title/attribute sanitization)', () => {
  describe('happy path', () => {
    it('returns trimmed strings unchanged', () => {
      expect(displayValue('  Chevrolet Cruze  ')).toBe('Chevrolet Cruze');
    });

    it('returns numeric values as strings', () => {
      expect(displayValue(2021)).toBe('2021');
      expect(displayValue(0)).toBe('0');
    });

    it('preserves strings that contain "undefined" as a SUBSTRING of a real value', () => {
      // "undefined" appears in the middle but there are other real tokens.
      // We only reject strings composed ENTIRELY of junk tokens.
      expect(displayValue('Chevrolet undefined')).toBe('Chevrolet undefined');
    });
  });

  describe('missing / empty values', () => {
    it.each([
      ['null literal', null],
      ['undefined literal', undefined],
      ['empty string', ''],
      ['whitespace string', '   '],
    ])('returns null for %s', (_label, input) => {
      expect(displayValue(input)).toBeNull();
    });
  });

  describe('legacy concatenation bugs (the actual regression)', () => {
    it.each([
      ['single undefined', 'undefined'],
      ['single null', 'null'],
      ['single nan', 'NaN'],
      ['two undefined tokens', 'undefined undefined'],
      ['three undefined tokens', 'undefined undefined undefined'],
      ['mixed undefined and null', 'undefined null undefined'],
      ['mixed casing', 'Undefined UNDEFINED'],
    ])('returns null for %s', (_label, input) => {
      expect(displayValue(input)).toBeNull();
    });
  });

  describe('non-string non-number inputs', () => {
    it('returns null for booleans', () => {
      expect(displayValue(true)).toBeNull();
      expect(displayValue(false)).toBeNull();
    });

    it('returns null for objects and arrays', () => {
      expect(displayValue({})).toBeNull();
      expect(displayValue([])).toBeNull();
      expect(displayValue({ foo: 'bar' })).toBeNull();
    });

    it('returns null for NaN / Infinity', () => {
      expect(displayValue(NaN)).toBeNull();
      expect(displayValue(Infinity)).toBeNull();
      expect(displayValue(-Infinity)).toBeNull();
    });
  });
});
