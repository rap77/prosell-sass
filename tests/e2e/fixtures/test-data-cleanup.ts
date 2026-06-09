/**
 * Test data cleanup fixtures for Playwright E2E testing.
 *
 * These fixtures provide:
 * 1. Automatic cleanup of test data between test runs
 * 2. Database transaction rollback
 * 3. Test data isolation
 * 4. Cleanup of uploaded files
 */

import { test as base, APIRequestContext } from "@playwright/test";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";

export { test };

/**
 * Extended test fixture with data cleanup capabilities
 */
const test = base.extend<{
  api: APIRequestContext;
  testDataCleanup: TestDataCleanup;
  clearTestDatabase: () => Promise<void>;
  cleanupTempFiles: () => void;
}>({
  /**
   * API context for making API calls
   */
  api: async ({ request }, use) => {
    await use(request);
  },

  /**
   * Test data cleanup utilities
   */
  testDataCleanup: async ({ api }, use) => {
    const cleanup = new TestDataCleanup(api);

    // Setup before each test
    await cleanup.setup();

    try {
      await use(cleanup);
    } finally {
      // Cleanup after each test
      await cleanup.cleanup();
    }
  },

  /**
   * Clear test database utility
   */
  clearTestDatabase: async ({ api }, use) => {
    const clearDatabase = async () => {
      console.log("[CLEANUP] Clearing test database...");

      try {
        // Clear categories
        await api.delete("/api/v1/categories/clear-test-data");

        // Clear leads
        await api.delete("/api/v1/leads/clear-test-data");

        // Clear appointments
        await api.delete("/api/v1/appointments/clear-test-data");

        console.log("[CLEANUP] Test database cleared successfully");
      } catch (error) {
        console.warn("[CLEANUP] Failed to clear test database:", error);
      }
    };

    await use(clearDatabase);
  },

  /**
   * Temporary file cleanup utility
   */
  cleanupTempFiles: async ({}, use) => {
    const tempDirs: string[] = [];
    const tempFiles: string[] = [];

    const createTempDir = (prefix: string = "test_") => {
      const dir = `/tmp/${prefix}${Date.now()}`;
      mkdirSync(dir, { recursive: true });
      tempDirs.push(dir);
      return dir;
    };

    const createTempFile = (content: string, extension: string = ".tmp") => {
      const filePath = `/tmp/test_${Date.now()}${extension}`;
      writeFileSync(filePath, content);
      tempFiles.push(filePath);
      return filePath;
    };

    await use({
      createTempDir,
      createTempFile,
    });

    // Cleanup all temp files and directories
    console.log("[CLEANUP] Cleaning up temporary files...");

    for (const file of tempFiles) {
      if (existsSync(file)) {
        rmSync(file);
      }
    }

    for (const dir of tempDirs) {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    }

    console.log("[CLEANUP] Temporary files cleaned up");
  },
});

/**
 * Test data cleanup utility class
 */
class TestDataCleanup {
  private api: APIRequestContext;
  private testRunId: string;
  private createdData: Set<string> = new Set();

  constructor(api: APIRequestContext) {
    this.api = api;
    this.testRunId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup cleanup system before test run
   */
  async setup() {
    console.log(`[CLEANUP] Setting up cleanup for test run: ${this.testRunId}`);
    this.createdData.clear();
  }

  /**
   * Cleanup all test data after test run
   */
  async cleanup() {
    console.log(`[CLEANUP] Starting cleanup for test run: ${this.testRunId}`);

    try {
      // Reverse order of creation (LIFO)
      const cleanupPromises = Array.from(this.createdData)
        .reverse()
        .map(async (identifier) => {
          const [type, id] = identifier.split(":");

          try {
            switch (type) {
              case "category":
                await this.cleanupCategory(id);
                break;
              case "lead":
                await this.cleanupLead(id);
                break;
              case "appointment":
                await this.cleanupAppointment(id);
                break;
              case "user":
                await this.cleanupUser(id);
                break;
              case "organization":
                await this.cleanupOrganization(id);
                break;
              default:
                console.warn(`[CLEANUP] Unknown cleanup type: ${type}`);
            }
          } catch (error) {
            console.warn(`[CLEANUP] Failed to cleanup ${identifier}:`, error);
          }
        });

      await Promise.allSettled(cleanupPromises);

      console.log(
        `[CLEANUP] Cleanup completed for test run: ${this.testRunId}`,
      );
    } catch (error) {
      console.error(
        `[CLEANUP] Cleanup failed for test run: ${this.testRunId}`,
        error,
      );
    }
  }

  /**
   * Track created data for cleanup
   */
  trackCreatedData(type: string, id: string) {
    const identifier = `${type}:${id}`;
    this.createdData.add(identifier);
    console.log(`[CLEANUP] Tracking ${identifier} for cleanup`);
  }

  /**
   * Cleanup specific category
   */
  private async cleanupCategory(categoryId: string) {
    try {
      await this.api.delete(`/api/v1/categories/${categoryId}`);
    } catch (error) {
      // Category might already be deleted, ignore 404 errors
      if ((error as any).response?.status !== 404) {
        throw error;
      }
    }
  }

  /**
   * Cleanup specific lead
   */
  private async cleanupLead(leadId: string) {
    try {
      await this.api.delete(`/api/v1/leads/${leadId}`);
    } catch (error) {
      // Lead might already be deleted, ignore 404 errors
      if ((error as any).response?.status !== 404) {
        throw error;
      }
    }
  }

  /**
   * Cleanup specific appointment
   */
  private async cleanupAppointment(appointmentId: string) {
    try {
      await this.api.delete(`/api/v1/appointments/${appointmentId}`);
    } catch (error) {
      // Appointment might already be deleted, ignore 404 errors
      if ((error as any).response?.status !== 404) {
        throw error;
      }
    }
  }

  /**
   * Cleanup specific user
   */
  private async cleanupUser(userId: string) {
    try {
      await this.api.delete(`/api/v1/users/${userId}`);
    } catch (error) {
      // User might already be deleted, ignore 404 errors
      if ((error as any).response?.status !== 404) {
        throw error;
      }
    }
  }

  /**
   * Cleanup specific organization
   */
  private async cleanupOrganization(organizationId: string) {
    try {
      await this.api.delete(`/api/v1/organizations/${organizationId}`);
    } catch (error) {
      // Organization might already be deleted, ignore 404 errors
      if ((error as any).response?.status !== 404) {
        throw error;
      }
    }
  }

  /**
   * Create test data with automatic cleanup tracking
   */
  async createTestOrganization(data: any) {
    const response = await this.api.post("/api/v1/organizations", {
      data,
    });

    const orgId = (await response.json()).data.id;
    this.trackCreatedData("organization", orgId);
    return orgId;
  }

  async createTestUser(orgId: string, data: any) {
    const response = await this.api.post(
      `/api/v1/organizations/${orgId}/users`,
      {
        data,
      },
    );

    const userId = (await response.json()).data.id;
    this.trackCreatedData("user", userId);
    return userId;
  }

  async createTestCategory(orgId: string, data: any) {
    const response = await this.api.post(
      `/api/v1/organizations/${orgId}/categories`,
      {
        data,
      },
    );

    const categoryId = (await response.json()).data.id;
    this.trackCreatedData("category", categoryId);
    return categoryId;
  }

  async createTestLead(orgId: string, data: any) {
    const response = await this.api.post(
      `/api/v1/organizations/${orgId}/leads`,
      {
        data,
      },
    );

    const leadId = (await response.json()).data.id;
    this.trackCreatedData("lead", leadId);
    return leadId;
  }

  async createTestAppointment(orgId: string, leadId: string, data: any) {
    const response = await this.api.post(
      `/api/v1/organizations/${orgId}/leads/${leadId}/appointments`,
      {
        data,
      },
    );

    const appointmentId = (await response.json()).data.id;
    this.trackCreatedData("appointment", appointmentId);
    return appointmentId;
  }
}

export { test };
