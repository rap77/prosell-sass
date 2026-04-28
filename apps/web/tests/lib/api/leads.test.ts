/**
 * Tests for leads API client
 */

import { describe, it, expect } from "vitest";
import { Lead, LeadStatus, CreateLeadRequest, UpdateLeadStatusRequest } from "@/lib/api/leads";

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

  describe("CreateLeadRequest interface", () => {
    it("should have required buyer_name field", () => {
      const request: CreateLeadRequest = {
        buyer_name: "Alice Johnson",
      };

      expect(request.buyer_name).toBe("Alice Johnson");
    });

    it("should allow optional fields", () => {
      const request: CreateLeadRequest = {
        buyer_name: "Bob Smith",
        buyer_email: "bob@example.com",
        buyer_phone: "+1-555-0789",
        vehicle_id: "vehicle-456",
        message: "Interested in this car",
      };

      expect(request.buyer_name).toBe("Bob Smith");
      expect(request.buyer_email).toBe("bob@example.com");
      expect(request.buyer_phone).toBe("+1-555-0789");
      expect(request.vehicle_id).toBe("vehicle-456");
      expect(request.message).toBe("Interested in this car");
    });

    it("should allow null for optional fields", () => {
      const request: CreateLeadRequest = {
        buyer_name: "Charlie",
        buyer_email: null,
        buyer_phone: null,
        vehicle_id: null,
        message: null,
      };

      expect(request.buyer_email).toBeNull();
      expect(request.buyer_phone).toBeNull();
      expect(request.vehicle_id).toBeNull();
      expect(request.message).toBeNull();
    });
  });

  describe("UpdateLeadStatusRequest interface", () => {
    it("should have required status field", () => {
      const request: UpdateLeadStatusRequest = {
        status: LeadStatus.CONTACTED,
      };

      expect(request.status).toBe(LeadStatus.CONTACTED);
    });

    it("should allow optional reason field", () => {
      const request: UpdateLeadStatusRequest = {
        status: LeadStatus.LOST,
        reason: "Buyer not interested",
      };

      expect(request.status).toBe(LeadStatus.LOST);
      expect(request.reason).toBe("Buyer not interested");
    });

    it("should allow null reason", () => {
      const request: UpdateLeadStatusRequest = {
        status: LeadStatus.QUALIFIED,
        reason: null,
      };

      expect(request.reason).toBeNull();
    });
  });
});
