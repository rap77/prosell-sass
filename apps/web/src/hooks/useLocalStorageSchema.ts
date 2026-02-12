/**
 * LocalStorage Schema Versioning Hook
 *
 * Provides utilities for managing localStorage schema migrations
 * Handles version checking and data migration between different versions
 *
 * @see https://vercel.com/docs/rules/client-local-storage-schema-versioning.md
 */
import { useState, useCallback, useEffect } from 'react';

interface SchemaVersion<T = unknown> {
  version: string;
  data: T;
  timestamp: number;
}

interface Migration<TFrom = unknown, TTo = unknown> {
  from: string;
  to: string;
  migrate: (data: TFrom) => TTo;
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

      const schema: SchemaVersion = JSON.parse(stored);
      return schema.version !== this.CURRENT_VERSION;
    } catch (error) {
      // Client-side storage error: log for debugging but continue with migration
      console.warn('Failed to check schema version:', error);
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

      const schema: SchemaVersion = JSON.parse(stored);

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
      // Client-side storage error: log for debugging before throwing
      console.error('Failed to migrate storage:', error);
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
 * Hook for safe localStorage access with schema awareness
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Get value only during initial render to avoid SSR issues
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Client-side storage error: log for debugging but return initial value
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // Client-side storage error: log for debugging but don't fail
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}
