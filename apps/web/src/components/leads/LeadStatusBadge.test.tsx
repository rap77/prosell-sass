/**
 * Component tests for LeadStatusBadge
 *
 * El componente usa inline styles con var(--ps-*) tokens, no clases Tailwind.
 * Los tests verifican: texto en español, data-testid, y className custom.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LeadStatus } from "@/lib/api/leads";

describe("LeadStatusBadge", () => {
  it("should render badge for NEW status with Spanish label", () => {
    render(<LeadStatusBadge status={LeadStatus.NEW} />);
    const badge = screen.getByTestId("status-badge");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Nuevo");
  });

  it("should render badge for CONTACTED status with Spanish label", () => {
    render(<LeadStatusBadge status={LeadStatus.CONTACTED} />);
    const badge = screen.getByTestId("status-badge");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Contactado");
  });

  it("should render badge for QUALIFIED status with Spanish label", () => {
    render(<LeadStatusBadge status={LeadStatus.QUALIFIED} />);
    const badge = screen.getByTestId("status-badge");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Calificado");
  });

  it("should render badge for APPOINTMENT_SET status with Spanish label", () => {
    render(<LeadStatusBadge status={LeadStatus.APPOINTMENT_SET} />);
    const badge = screen.getByTestId("status-badge");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Cita agendada");
  });

  it("should render badge for LOST status with Spanish label", () => {
    render(<LeadStatusBadge status={LeadStatus.LOST} />);
    const badge = screen.getByTestId("status-badge");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Perdido");
  });

  it("should apply custom className to the badge element", () => {
    render(
      <LeadStatusBadge status={LeadStatus.NEW} className="custom-class" />,
    );
    const badge = screen.getByTestId("status-badge");

    expect(badge).toHaveClass("custom-class");
  });
});
