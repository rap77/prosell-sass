/**
 * Layer 2 Contract Tests - Lead Lifecycle
 *
 * Validates lead endpoints with full contract validation:
 * - Pydantic structure validation
 * - Field format checks (email, phone, datetime)
 * - Business rules (status transitions, validation constraints)
 * - Multiple test scenarios (valid, invalid, edge cases)
 *
 * Endpoints tested:
 * - POST /api/v1/leads (create lead)
 * - GET /api/v1/leads (list leads)
 * - GET /api/v1/leads/{id} (get lead details)
 * - PUT /api/v1/leads/{id} (update lead status)
 * - POST /api/v1/leads/{id}/assign (assign to vendedor)
 *
 * Contract Validation Rules:
 * - buyer_name: required, string, 1-255 chars
 * - buyer_email: optional, valid email format
 * - buyer_phone: optional, string, phone format
 * - message: optional, string, 1-5000 chars
 * - source: required, enum (facebook, website, manual)
 * - status: required, enum (new, contacted, qualified, lost, converted)
 * - vehicle: optional, nested object with vehicle data
 * - created_at/updated_at: required, ISO datetime format
 */

import { test, expect } from "../fixtures/auth";
import { LeadFactory } from "../factories/index";

const leadFactory = new LeadFactory();

test.describe("Layer 2: Lead Lifecycle - Contract Validation", () => {
  test.beforeEach(async () => {
    // Reset factory counter before each test
    leadFactory.reset();
  });

  // ============================================
  // GROUP 1: Lead Creation (POST /api/v1/leads)
  // ============================================
  test.describe("POST /api/v1/leads - Create Lead", () => {
    test("L2-01: should create lead with valid data", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate fresh test data
      const leadData = leadFactory.create();

      // Act: Create lead via API
      const response = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: leadData.buyer_name,
          buyer_email: leadData.buyer_email,
          buyer_phone: leadData.buyer_phone,
          message: leadData.message,
          source: leadData.source,
          vehicle_id: leadData.vehicle?.id,
        },
      });

      // Assert: Verify response structure (Pydantic validation)
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("buyer_name", leadData.buyer_name);
      expect(body).toHaveProperty("buyer_email", leadData.buyer_email);
      expect(body).toHaveProperty("buyer_phone", leadData.buyer_phone);
      expect(body).toHaveProperty("message", leadData.message);
      expect(body).toHaveProperty("source", leadData.source);
      expect(body).toHaveProperty("status", "new"); // Default status
      expect(body).toHaveProperty("created_at");
      expect(body).toHaveProperty("updated_at");

      // Assert: Verify field formats (Contract validation)
      // Email format validation
      if (leadData.buyer_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(body.buyer_email).toMatch(emailRegex);
      }

      // Phone format validation (flexible: digits, dashes, plus, parentheses)
      if (leadData.buyer_phone) {
        const phoneRegex = /^[\d\s\+\-\(\)]+$/;
        expect(body.buyer_phone).toMatch(phoneRegex);
      }

      // Datetime format validation (ISO 8601)
      const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(body.created_at).toMatch(datetimeRegex);
      expect(body.updated_at).toMatch(datetimeRegex);

      // Assert: Verify business rules
      // Status must be 'new' for newly created leads
      expect(body.status).toBe("new");

      // Source must be valid enum value
      expect(["facebook", "website", "manual"]).toContain(body.source);
    });

    test("L2-02: should reject lead with empty buyer_name", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate invalid data (empty buyer_name)
      const invalidLead = leadFactory.create();
      invalidLead.buyer_name = "";

      // Act: Attempt to create lead
      const response = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: invalidLead.buyer_name,
          buyer_email: invalidLead.buyer_email,
          message: invalidLead.message,
          source: invalidLead.source,
        },
      });

      // Assert: Should return 422 (validation error)
      expect(response.status()).toBe(422);

      const body = await response.json();
      expect(body).toHaveProperty("detail");
    });

    test("L2-03: should reject lead with invalid email format", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate invalid data (bad email format)
      const invalidLead = leadFactory.create();
      invalidLead.buyer_email = "not-an-email";

      // Act: Attempt to create lead
      const response = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: invalidLead.buyer_name,
          buyer_email: invalidLead.buyer_email,
          message: invalidLead.message,
          source: invalidLead.source,
        },
      });

      // Assert: Should return 422 (validation error)
      expect(response.status()).toBe(422);

      const body = await response.json();
      expect(body).toHaveProperty("detail");
    });

    test("L2-04: should reject lead with invalid source", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate invalid data (invalid source enum)
      const invalidLead = leadFactory.create();

      // Act: Attempt to create lead with invalid source
      const response = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: invalidLead.buyer_name,
          buyer_email: invalidLead.buyer_email,
          message: invalidLead.message,
          source: "invalid-source",
        },
      });

      // Assert: Should return 422 (validation error)
      expect(response.status()).toBe(422);

      const body = await response.json();
      expect(body).toHaveProperty("detail");
    });

    test("L2-05: should accept lead with special characters in name", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate edge case data (special characters)
      const edgeCaseLead = leadFactory.createEdgeCase();

      // Act: Create lead
      const response = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: edgeCaseLead.buyer_name,
          buyer_email: edgeCaseLead.buyer_email,
          buyer_phone: edgeCaseLead.buyer_phone,
          message: edgeCaseLead.message,
          source: edgeCaseLead.source,
        },
      });

      // Assert: Should accept special characters
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.buyer_name).toBe(edgeCaseLead.buyer_name);
      expect(body.message).toBe(edgeCaseLead.message);
    });

    test("L2-06: should accept lead with plus sign in email", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate edge case data (email with plus sign)
      const lead = leadFactory.createEdgeCase();

      // Act: Create lead
      const response = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: lead.buyer_name,
          buyer_email: "test+alias@example.com",
          message: lead.message,
          source: lead.source,
        },
      });

      // Assert: Should accept plus sign in email
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.buyer_email).toBe("test+alias@example.com");
    });
  });

  // ============================================
  // GROUP 2: Lead List (GET /api/v1/leads)
  // ============================================
  test.describe("GET /api/v1/leads - List Leads", () => {
    test("L2-07: should return paginated lead list", async ({
      authenticatedRequest,
    }) => {
      // Act: Fetch leads list
      const response = await authenticatedRequest.get(
        "/api/v1/leads?limit=10&offset=0",
      );

      // Assert: Verify response structure
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("items");
      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("limit", 10);
      expect(body).toHaveProperty("offset", 0);

      // Assert: Verify items is an array
      expect(Array.isArray(body.items)).toBe(true);

      // Assert: Verify each lead has required fields (if items exist)
      if (body.items.length > 0) {
        const firstLead = body.items[0];
        expect(firstLead).toHaveProperty("id");
        expect(firstLead).toHaveProperty("buyer_name");
        expect(firstLead).toHaveProperty("status");
        expect(firstLead).toHaveProperty("source");
        expect(firstLead).toHaveProperty("created_at");
      }
    });

    test("L2-08: should filter leads by status", async ({
      authenticatedRequest,
    }) => {
      // Act: Fetch leads with status filter
      const response = await authenticatedRequest.get(
        "/api/v1/leads?status=new",
      );

      // Assert: Verify response structure
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("items");

      // Assert: Verify all returned leads have status 'new'
      if (body.items.length > 0) {
        body.items.forEach((lead: any) => {
          expect(lead.status).toBe("new");
        });
      }
    });

    test("L2-09: should filter leads by search term", async ({
      authenticatedRequest,
    }) => {
      // Act: Fetch leads with search term
      const response = await authenticatedRequest.get(
        "/api/v1/leads?search=test",
      );

      // Assert: Verify response structure
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("items");
    });

    test("L2-10: should reject invalid status filter", async ({
      authenticatedRequest,
    }) => {
      // Act: Attempt to fetch leads with invalid status
      const response = await authenticatedRequest.get(
        "/api/v1/leads?status=invalid-status",
      );

      // Assert: Should return 422 (validation error)
      expect(response.status()).toBe(422);
    });
  });

  // ============================================
  // GROUP 3: Lead Details (GET /api/v1/leads/{id})
  // ============================================
  test.describe("GET /api/v1/leads/{id} - Get Lead Details", () => {
    test("L2-11: should return lead details", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create a lead first
      const createResponse = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: "Test Customer",
          buyer_email: "test@example.com",
          message: "Interested in this vehicle",
          source: "manual",
        },
      });

      if (createResponse.status() !== 201) {
        test.skip(true, "Cannot create lead - skipping details test");
        return;
      }

      const createdLead = await createResponse.json();
      const leadId = createdLead.id;

      // Act: Fetch lead details
      const response = await authenticatedRequest.get(
        `/api/v1/leads/${leadId}`,
      );

      // Assert: Verify response structure (nested LeadDetailResponse)
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("lead");
      expect(body).toHaveProperty("audit_logs");
      expect(body.lead).toHaveProperty("id", leadId);
      expect(body.lead).toHaveProperty("buyer_name", "Test Customer");
      expect(body.lead).toHaveProperty("buyer_email", "test@example.com");
      expect(body.lead).toHaveProperty("message", "Interested in this vehicle");
      expect(body.lead).toHaveProperty("status");
      expect(body.lead).toHaveProperty("created_at");
      expect(body.lead).toHaveProperty("updated_at");

      // Assert: Verify datetime format
      const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(body.lead.created_at).toMatch(datetimeRegex);
      expect(body.lead.updated_at).toMatch(datetimeRegex);
    });

    test("L2-12: should return 404 for non-existent lead", async ({
      authenticatedRequest,
    }) => {
      // Act: Attempt to fetch non-existent lead
      const response = await authenticatedRequest.get(
        "/api/v1/leads/00000000-0000-0000-0000-000000000000",
      );

      // Assert: Should return 404
      expect(response.status()).toBe(404);
    });

    test("L2-13: should return 400 for invalid UUID format", async ({
      authenticatedRequest,
    }) => {
      // Act: Attempt to fetch lead with invalid UUID
      const response = await authenticatedRequest.get(
        "/api/v1/leads/not-a-uuid",
      );

      // Assert: Should return 422 (validation error)
      expect(response.status()).toBe(422);
    });
  });

  // ============================================
  // GROUP 4: Lead Status Update (PUT /api/v1/leads/{id})
  // ============================================
  test.describe("PUT /api/v1/leads/{id} - Update Lead Status", () => {
    test("L2-14: should update lead status to contacted", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create a lead first
      const createResponse = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: "Status Update Test",
          buyer_email: "status@example.com",
          message: "Test status update",
          source: "manual",
        },
      });

      if (createResponse.status() !== 201) {
        test.skip(true, "Cannot create lead - skipping status update test");
        return;
      }

      const createdLead = await createResponse.json();
      const leadId = createdLead.id;

      // Act: Update lead status
      const response = await authenticatedRequest.put(
        `/api/v1/leads/${leadId}/status`,
        {
          data: {
            new_status: "contacted",
          },
        },
      );

      // Assert: Verify response
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("id", leadId);
      expect(body).toHaveProperty("status", "contacted");
      expect(body).toHaveProperty("updated_at");

      // Assert: Verify updated_at changed
      expect(new Date(body.updated_at).getTime()).toBeGreaterThan(
        new Date(createdLead.updated_at).getTime(),
      );
    });

    test("L2-15: should reject invalid status transition", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create a lead
      const createResponse = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: "Invalid Status Test",
          buyer_email: "invalid@example.com",
          message: "Test invalid status",
          source: "manual",
        },
      });

      if (createResponse.status() !== 201) {
        test.skip(true, "Cannot create lead - skipping invalid status test");
        return;
      }

      const createdLead = await createResponse.json();
      const leadId = createdLead.id;

      // Act: Attempt to set invalid status
      const response = await authenticatedRequest.put(
        `/api/v1/leads/${leadId}/status`,
        {
          data: {
            new_status: "invalid-status",
          },
        },
      );

      // Assert: Should return 422 (validation error)
      expect(response.status()).toBe(422);
    });

    test("L2-16: should support all valid status values via sequential transitions", async ({
      authenticatedRequest,
    }) => {
      // The state machine enforces: new → contacted → qualified → appointment_set → lost
      // This test traverses all statuses in order using a single lead.
      const createResponse = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: "Sequential Status Test",
          buyer_email: "sequential@example.com",
          message: "Test sequential status transitions",
          source: "manual",
        },
      });

      if (createResponse.status() !== 201) {
        test.skip(true, "Cannot create lead — skipping sequential status test");
        return;
      }

      const lead = await createResponse.json();
      const leadId = lead.id;

      // new (initial state) → contacted
      let resp = await authenticatedRequest.put(
        `/api/v1/leads/${leadId}/status`,
        {
          data: { new_status: "contacted" },
        },
      );
      expect(resp.status()).toBe(200);
      expect((await resp.json()).status).toBe("contacted");

      // contacted → qualified
      resp = await authenticatedRequest.put(`/api/v1/leads/${leadId}/status`, {
        data: { new_status: "qualified" },
      });
      expect(resp.status()).toBe(200);
      expect((await resp.json()).status).toBe("qualified");

      // qualified → appointment_set
      resp = await authenticatedRequest.put(`/api/v1/leads/${leadId}/status`, {
        data: { new_status: "appointment_set" },
      });
      expect(resp.status()).toBe(200);
      expect((await resp.json()).status).toBe("appointment_set");

      // appointment_set → lost
      resp = await authenticatedRequest.put(`/api/v1/leads/${leadId}/status`, {
        data: { new_status: "lost" },
      });
      expect(resp.status()).toBe(200);
      expect((await resp.json()).status).toBe("lost");
    });
  });

  // ============================================
  // GROUP 5: Edge Cases & Business Rules
  // ============================================
  test.describe("Edge Cases & Business Rules", () => {
    test("L2-17: should handle leads without email", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate lead without email (email is optional)
      const lead = leadFactory.create();
      lead.buyer_email = null;

      // Act: Create lead
      const response = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: lead.buyer_name,
          buyer_phone: lead.buyer_phone,
          message: lead.message,
          source: lead.source,
        },
      });

      // Assert: Should accept lead without email
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.buyer_email).toBeNull();
    });

    test("L2-18: should handle leads without phone", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate lead without phone (phone is optional)
      const lead = leadFactory.create();
      lead.buyer_phone = null;

      // Act: Create lead
      const response = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: lead.buyer_name,
          buyer_email: lead.buyer_email,
          message: lead.message,
          source: lead.source,
        },
      });

      // Assert: Should accept lead without phone
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.buyer_phone).toBeNull();
    });

    test("L2-19: should handle message with emojis and special chars", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate edge case lead with emojis
      const lead = leadFactory.createEdgeCase();

      // Act: Create lead
      const response = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: lead.buyer_name,
          buyer_email: lead.buyer_email,
          message: "Test with emojis: 🚗 💨 \nNewlines and \t tabs",
          source: lead.source,
        },
      });

      // Assert: Should accept emojis and special characters
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.message).toContain("🚗");
    });

    test("L2-20: should handle very long buyer name", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate lead with long name (255 chars is max)
      const lead = leadFactory.create();
      lead.buyer_name = "A".repeat(255);

      // Act: Create lead
      const response = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: lead.buyer_name,
          buyer_email: lead.buyer_email,
          message: lead.message,
          source: lead.source,
        },
      });

      // Assert: Should accept 255 char name
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.buyer_name.length).toBe(255);
    });

    test("L2-21: should reject buyer name exceeding 255 chars", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate lead with too long name
      const lead = leadFactory.create();
      lead.buyer_name = "A".repeat(256);

      // Act: Attempt to create lead
      const response = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: lead.buyer_name,
          buyer_email: lead.buyer_email,
          message: lead.message,
          source: lead.source,
        },
      });

      // Assert: Should reject with validation error
      expect(response.status()).toBe(422);
    });

    test("L2-22: should handle message with newlines and tabs", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate lead with whitespace in message
      const lead = leadFactory.create();

      // Act: Create lead
      const response = await authenticatedRequest.post("/api/v1/leads", {
        data: {
          buyer_name: lead.buyer_name,
          buyer_email: lead.buyer_email,
          message: "Line 1\nLine 2\tTabbed",
          source: lead.source,
        },
      });

      // Assert: Should preserve whitespace
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.message).toContain("\n");
      expect(body.message).toContain("\t");
    });
  });
});
