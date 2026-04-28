/**
 * Component tests for LeadStatusBadge
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LeadStatus } from "@/lib/api/leads";

describe("LeadStatusBadge", () => {
  it("should render New status badge", () => {
    render(<LeadStatusBadge status={LeadStatus.NEW} />);
    const badge = screen.getByText("New");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-blue-100", "text-blue-800", "border-blue-200");
  });

  it("should render Contacted status badge", () => {
    render(<LeadStatusBadge status={LeadStatus.CONTACTED} />);
    const badge = screen.getByText("Contacted");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-yellow-100", "text-yellow-800", "border-yellow-200");
  });

  it("should render Qualified status badge", () => {
    render(<LeadStatusBadge status={LeadStatus.QUALIFIED} />);
    const badge = screen.getByText("Qualified");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-green-100", "text-green-800", "border-green-200");
  });

  it("should render Appointment Set status badge", () => {
    render(<LeadStatusBadge status={LeadStatus.APPOINTMENT_SET} />);
    const badge = screen.getByText("Appointment Set");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-purple-100", "text-purple-800", "border-purple-200");
  });

  it("should render Lost status badge", () => {
    render(<LeadStatusBadge status={LeadStatus.LOST} />);
    const badge = screen.getByText("Lost");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-gray-100", "text-gray-800", "border-gray-200");
  });

  it("should apply custom className", () => {
    render(<LeadStatusBadge status={LeadStatus.NEW} className="custom-class" />);
    const badge = screen.getByText("New");

    expect(badge).toHaveClass("custom-class");
  });
});
