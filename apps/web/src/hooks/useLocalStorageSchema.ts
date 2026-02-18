/**
 * LocalStorage Schema Versioning Hook
 *
 * Provides utilities for managing localStorage schema migrations
 * Handles version checking and data migration between different versions
 *
 * @see https://vercel.com/docs/rules/client-local-storage-schema-versioning.md
 */

import { useState, useEffect } from 'react';

import { logger } from '@/lib/logger';

interface SchemaVersion<T = unknown> {
  version: string;
  data: T;
  timestamp: number;
}

interface Migration<T = unknown> {
  from: string;
  to: string;
  migrate: (data: T) => T;
}

/**
 * Schema version manager
 */
export class LocalStorageSchemaManager {
  private static readonly STORAGE_KEY = 'app_schema_version';
  private static readonly CURRENT_VERSION = '1.0.0';
  private static readonly MIGRATIONS: Migration[] = [
    {
      from: '0.9.0',
      to: '1.0.0',
      migrate: (data) => {
        // Migration from 0.9.0 to 1.0.0
        // Add timestamp to all stored data
        return {
          ...data,
          timestamp: Date.now(),
        };
      },
    },
    {
      from: '0.8.0',
      to: '0.9.0',
      migrate: (data) => {
        // Migration from 0.8.0 to 0.9.0
        // Add version field to all stored data
        return {
          ...data,
          version: '0.9.0',
          timestamp: Date.now(),
        };
      },
    },
  ];

  /**
   * Check if storage needs migration
   */
  static needsMigration(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return true; // First time setup
      }

      const schema = JSON.parse(stored) as SchemaVersion;
      return schema.version !== this.CURRENT_VERSION;
    } catch (error) {
      logger.error("Failed to check schema version", error);
      return true;
    }
  }

  /**
   * Migrate storage to current version
   */
  static async migrateStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);

      if (!stored) {
        // First time setup
        const initialSchema: SchemaVersion = {
          version: this.CURRENT_VERSION,
          data: {},
          timestamp: Date.now(),
        };

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initialSchema));
        return;
      }

      const schema = JSON.parse(stored) as SchemaVersion;

      // Find the migration path
      let currentVersion = schema.version;
      let currentData = schema.data;

      while (currentVersion !== this.CURRENT_VERSION) {
        const migration = this.MIGRATIONS.find(m => m.from === currentVersion);

        if (!migration) {
          throw new Error(`No migration found from version ${currentVersion}`);
        }

        currentData = migration.migrate(currentData);
        currentVersion = migration.to;
      }

      // Save the migrated schema
      const migratedSchema: SchemaVersion = {
        version: this.CURRENT_VERSION,
        data: currentData,
        timestamp: Date.now(),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(migratedSchema));
    } catch (error) {
      logger.error("Failed to migrate storage", error);
      throw error;
    }
  }

  /**
   * Get current version
   */
  static getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  /**
   * Check if a specific version is supported
   */
  static isVersionSupported(version: string): boolean {
    return version === this.CURRENT_VERSION;
  }

  /**
   * Clear all schema data
   */
  static clearStorage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

/**
 * Hook for managing localStorage schema versioning
 */
export function useLocalStorageSchema() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSchema = async () => {
      try {
        // Check if migration is needed
        if (LocalStorageSchemaManager.needsMigration()) {
          await LocalStorageSchemaManager.migrateStorage();
        }
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize schema');
        setIsLoading(false);
      }
    };

    initializeSchema();
  }, []);

  return {
    isLoading,
    error,
    currentVersion: LocalStorageSchemaManager.getCurrentVersion(),
    needsMigration: LocalStorageSchemaManager.needsMigration(),
    migrateStorage: LocalStorageSchemaManager.migrateStorage,
    clearStorage: LocalStorageSchemaManager.clearStorage,
  };
}

/**
 * Hook for safe localStorage access with versioning
 *
 * @example
 * ```tsx
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 * // Stores as 'theme:v1' in localStorage for schema migration support
 * ```
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Version prefix for schema migration support
  const STORAGE_VERSION = 'v1';
  const versionedKey = `${key}:${STORAGE_VERSION}`;

  const [storedValue, setStoredValue] = useState<T>(() => {
    // Get value only during initial render to avoid SSR issues
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = localStorage.getItem(versionedKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.error(`Error reading localStorage key "${key}"`, error);
      return initialValue;
    }
  });

  // React 19: No useCallback needed, React Compiler handles optimization
  function setValue(value: T | ((val: T) => T)) {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        localStorage.setItem(versionedKey, JSON.stringify(valueToStore));
      }
    } catch (error) {
      logger.error(`Error setting localStorage key "${key}"`, error);
    }
  }

  return [storedValue, setValue] as const;
}
