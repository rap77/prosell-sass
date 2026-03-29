/**
 * useLocalStorageSchema Hook Tests
 *
 * Tests localStorage schema versioning and migration
 * Phase 09: Verifies useCallback removal (React Compiler handles optimization)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useLocalStorageSchema,
  LocalStorageSchemaManager,
  useLocalStorage,
} from "@/hooks/useLocalStorageSchema";

// Mock logger to avoid console output in tests
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("useLocalStorageSchema", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("LocalStorageSchemaManager", () => {
    it("should detect first-time setup needs migration", () => {
      expect(LocalStorageSchemaManager.needsMigration()).toBe(true);
    });

    it("should initialize schema on first run", async () => {
      await LocalStorageSchemaManager.migrateStorage();

      const stored = localStorage.getItem("app_schema_version");
      expect(stored).toBeTruthy();

      const schema = JSON.parse(stored!);
      expect(schema.version).toBe("1.0.0");
      expect(schema.data).toEqual({});
      expect(schema.timestamp).toBeTypeOf("number");
    });

    it("should not need migration after initialization", async () => {
      await LocalStorageSchemaManager.migrateStorage();

      expect(LocalStorageSchemaManager.needsMigration()).toBe(false);
    });

    it("should return current version", () => {
      expect(LocalStorageSchemaManager.getCurrentVersion()).toBe("1.0.0");
    });

    it("should check version support", () => {
      expect(LocalStorageSchemaManager.isVersionSupported("1.0.0")).toBe(true);
      expect(LocalStorageSchemaManager.isVersionSupported("0.9.0")).toBe(false);
    });

    it("should clear storage", () => {
      localStorage.setItem("app_schema_version", JSON.stringify({ version: "1.0.0", data: {}, timestamp: Date.now() }));

      LocalStorageSchemaManager.clearStorage();

      expect(localStorage.getItem("app_schema_version")).toBeNull();
    });

    it("should migrate from 0.9.0 to 1.0.0", async () => {
      // Setup old version
      const oldSchema = {
        version: "0.9.0",
        data: { test: "value" },
        timestamp: Date.now(),
      };
      localStorage.setItem("app_schema_version", JSON.stringify(oldSchema));

      expect(LocalStorageSchemaManager.needsMigration()).toBe(true);

      await LocalStorageSchemaManager.migrateStorage();

      const stored = localStorage.getItem("app_schema_version");
      const schema = JSON.parse(stored!);
      expect(schema.version).toBe("1.0.0");
      expect(schema.data.test).toBe("value");
    });

    it("should migrate from 0.8.0 to 1.0.0", async () => {
      // Setup old version
      const oldSchema = {
        version: "0.8.0",
        data: { test: "value" },
      };
      localStorage.setItem("app_schema_version", JSON.stringify(oldSchema));

      expect(LocalStorageSchemaManager.needsMigration()).toBe(true);

      await LocalStorageSchemaManager.migrateStorage();

      const stored = localStorage.getItem("app_schema_version");
      const schema = JSON.parse(stored!);
      expect(schema.version).toBe("1.0.0");
      expect(schema.data.test).toBe("value");
    });
  });

  describe("useLocalStorageSchema hook", () => {
    it("should initialize schema on mount", async () => {
      const { result } = renderHook(() => useLocalStorageSchema());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });

    it("should return current version", async () => {
      const { result } = renderHook(() => useLocalStorageSchema());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentVersion).toBe("1.0.0");
    });

    it("should expose migrateStorage function", async () => {
      const { result } = renderHook(() => useLocalStorageSchema());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.migrateStorage).toBe("function");
    });

    it("should expose clearStorage function", async () => {
      const { result } = renderHook(() => useLocalStorageSchema());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.clearStorage).toBe("function");
    });

    it("should handle migration errors gracefully", async () => {
      // Mock JSON.parse to throw error
      const originalParse = JSON.parse;
      JSON.parse = vi.fn(() => {
        throw new Error("Parse error");
      });

      const { result } = renderHook(() => useLocalStorageSchema());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain("Failed to initialize schema");

      // Restore original
      JSON.parse = originalParse;
    });
  });

  describe("useLocalStorage hook", () => {
    it("should read and write values", async () => {
      const { result } = renderHook(() =>
        useLocalStorage("test-key", "default"),
      );

      expect(result.current[0]).toBe("default");

      act(() => {
        result.current[1]("new-value");
      });

      expect(result.current[0]).toBe("new-value");
      expect(localStorage.getItem("test-key")).toBe('"new-value"');
    });

    it("should use updater function", async () => {
      const { result } = renderHook(() =>
        useLocalStorage("count", 0),
      );

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      expect(result.current[0]).toBe(1);
    });

    it("should handle storage errors gracefully", async () => {
      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error("Storage error");
      });

      const { result } = renderHook(() =>
        useLocalStorage("test-key", "default"),
      );

      // Should not throw, just log warning
      act(() => {
        result.current[1]("new-value");
      });

      // Value should still be updated in state (React state works)
      expect(result.current[0]).toBe("new-value");

      // Restore original
      localStorage.setItem = originalSetItem;
    });

    it("should return initial value on SSR", async () => {
      // Mock window as undefined (SSR scenario)
      const originalWindow = global.window;
      // @ts-ignore - testing SSR scenario
      delete global.window;

      const { result } = renderHook(() =>
        useLocalStorage("test-key", "default"),
      );

      expect(result.current[0]).toBe("default");

      // Restore window
      global.window = originalWindow;
    });
  });
});
