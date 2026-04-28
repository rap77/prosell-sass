/**
 * Tests for leads API client
 */

import { describe, it, expect } from "vitest";
import { Lead, LeadStatus } from "@/lib/api/leads";

describe("Lead Interface", () => {
  describe("Lead type definition", () => {
    it("should have all required fields", () => {
      const lead: Lead = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        buyer_name: "John Doe",
        buyer_email: "john@example.com",
        buyer_phone: "+1-555-0123",
        vehicle: {
          id: "vehicle-123",
          title: "2020 Toyota Camry",
          make: "Toyota",
          model: "Camry",
          year: 2020,
        },
        message: "I'm interested in this vehicle",
        status: "new" as LeadStatus,
        source: "facebook",
        created_at: "2026-04-28T12:00:00Z",
        updated_at: "2026-04-28T12:00:00Z",
      };

      expect(lead.id).toBeDefined();
      expect(lead.buyer_name).toBe("John Doe");
      expect(lead.buyer_email).toBe("john@example.com");
      expect(lead.buyer_phone).toBe("+1-555-0123");
      expect(lead.vehicle).toBeDefined();
      expect(lead.vehicle?.title).toBe("2020 Toyota Camry");
      expect(lead.message).toBe("I'm interested in this vehicle");
      expect(lead.status).toBe("new");
      expect(lead.source).toBe("facebook");
      expect(lead.created_at).toBeDefined();
      expect(lead.updated_at).toBeDefined();
    });

    it("should allow optional buyer_email", () => {
      const lead: Lead = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        buyer_name: "Jane Doe",
        buyer_email: null,
        buyer_phone: "+1-555-0456",
        vehicle: null,
        message: null,
        status: "new" as LeadStatus,
        source: "web",
        created_at: "2026-04-28T12:00:00Z",
        updated_at: "2026-04-28T12:00:00Z",
      };

      expect(lead.buyer_email).toBeNull();
    });

    it("should allow null vehicle", () => {
      const lead: Lead = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        buyer_name: "Bob Smith",
        buyer_email: "bob@example.com",
        buyer_phone: null,
        vehicle: null,
        message: "General inquiry",
        status: "contacted" as LeadStatus,
        source: "manual",
        created_at: "2026-04-28T12:00:00Z",
        updated_at: "2026-04-28T12:00:00Z",
      };

      expect(lead.vehicle).toBeNull();
    });
  });

  describe("LeadStatus enum", () => {
    it("should have all 5 status values", () => {
      expect(LeadStatus.NEW).toBe("new");
      expect(LeadStatus.CONTACTED).toBe("contacted");
      expect(LeadStatus.QUALIFIED).toBe("qualified");
      expect(LeadStatus.APPOINTMENT_SET).toBe("appointment_set");
      expect(LeadStatus.LOST).toBe("lost");
    });
  });
});
