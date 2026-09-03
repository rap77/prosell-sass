import { describe, it, expect } from "vitest";
import { BackendLeadResponseSchema, LeadStatus } from "@/lib/api/schemas/leads";
import {
  BackendAppointmentResponseSchema,
  AppointmentStatus,
} from "@/lib/api/schemas/appointments";

describe("Zod 3 → 4 migration: z.nativeEnum() → z.enum()", () => {
  const baseLead = {
    id: "lead-1",
    tenant_id: "tenant-1",
    buyer_name: "Juan Perez",
    buyer_email: null,
    buyer_phone: null,
    product_id: null,
    vendedor_id: null,
    message: null,
    source: "web",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  it("accepts a valid LeadStatus enum member", () => {
    const parsed = BackendLeadResponseSchema.parse({
      ...baseLead,
      status: LeadStatus.QUALIFIED,
    });
    expect(parsed.status).toBe(LeadStatus.QUALIFIED);
  });

  it("rejects an invalid LeadStatus string", () => {
    expect(() =>
      BackendLeadResponseSchema.parse({ ...baseLead, status: "not-a-status" }),
    ).toThrow();
  });

  const baseAppointment = {
    id: "appt-1",
    tenant_id: "tenant-1",
    lead_id: "lead-1",
    user_id: "user-1",
    product_id: "product-1",
    scheduled_at: "2026-01-01T00:00:00Z",
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  it("accepts a valid AppointmentStatus enum member", () => {
    const parsed = BackendAppointmentResponseSchema.parse({
      ...baseAppointment,
      status: AppointmentStatus.SCHEDULED,
    });
    expect(parsed.status).toBe(AppointmentStatus.SCHEDULED);
  });

  it("rejects an invalid AppointmentStatus string", () => {
    expect(() =>
      BackendAppointmentResponseSchema.parse({
        ...baseAppointment,
        status: "not-a-status",
      }),
    ).toThrow();
  });
});
