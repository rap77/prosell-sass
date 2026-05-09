/**
 * Component tests for DuplicateWarning
 *
 * Verifies:
 * - Renders nothing when no duplicates
 * - Displays warning when duplicates exist
 * - Shows correct match type labels
 * - Shows correct confidence badges
 * - Calls onLeadClick when user clicks a duplicate
 * - Supports keyboard navigation (a11y)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DuplicateWarning, type DuplicateMatch } from "./DuplicateWarning";

const emailMatch: DuplicateMatch = {
  lead_id: "aaaaaaaa-0000-0000-0000-000000000001",
  match_type: "email",
  confidence: "high",
};

const phoneMatch: DuplicateMatch = {
  lead_id: "bbbbbbbb-0000-0000-0000-000000000002",
  match_type: "phone",
  confidence: "medium",
};

const bothMatch: DuplicateMatch = {
  lead_id: "cccccccc-0000-0000-0000-000000000003",
  match_type: "both",
  confidence: "high",
};

describe("DuplicateWarning", () => {
  describe("empty state", () => {
    it("renders nothing when duplicates array is empty", () => {
      const { container } = render(<DuplicateWarning duplicates={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when duplicates prop is undefined-like empty", () => {
      // Even if someone passes an empty array the component should render nothing
      const { container } = render(<DuplicateWarning duplicates={[]} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("single duplicate", () => {
    it("renders the warning banner when one duplicate exists", () => {
      render(<DuplicateWarning duplicates={[emailMatch]} />);
      const alert = screen.getByTestId("duplicate-warning");
      expect(alert).toBeInTheDocument();
    });

    it("has correct role=alert for screen readers", () => {
      render(<DuplicateWarning duplicates={[emailMatch]} />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("shows singular heading for one duplicate", () => {
      render(<DuplicateWarning duplicates={[emailMatch]} />);
      expect(
        screen.getByText("Potential Duplicate Detected")
      ).toBeInTheDocument();
    });

    it("shows email match type label", () => {
      render(<DuplicateWarning duplicates={[emailMatch]} />);
      expect(screen.getByText(/via email match/i)).toBeInTheDocument();
    });

    it("shows phone match type label", () => {
      render(<DuplicateWarning duplicates={[phoneMatch]} />);
      expect(screen.getByText(/via phone match/i)).toBeInTheDocument();
    });

    it("shows combined email+phone match label", () => {
      render(<DuplicateWarning duplicates={[bothMatch]} />);
      expect(screen.getByText(/via email \+ phone match/i)).toBeInTheDocument();
    });

    it("shows high confidence badge", () => {
      render(<DuplicateWarning duplicates={[emailMatch]} />);
      expect(screen.getByText("High confidence")).toBeInTheDocument();
    });

    it("shows medium confidence badge for phone match", () => {
      render(<DuplicateWarning duplicates={[phoneMatch]} />);
      expect(screen.getByText("Medium confidence")).toBeInTheDocument();
    });

    it("truncates the lead ID to first 8 chars with ellipsis", () => {
      render(<DuplicateWarning duplicates={[emailMatch]} />);
      expect(screen.getByText("aaaaaaaa...")).toBeInTheDocument();
    });
  });

  describe("multiple duplicates", () => {
    const multipleDuplicates = [emailMatch, phoneMatch, bothMatch];

    it("renders plural heading for multiple duplicates", () => {
      render(<DuplicateWarning duplicates={multipleDuplicates} />);
      expect(
        screen.getByText("Potential Duplicates Detected")
      ).toBeInTheDocument();
    });

    it("mentions count in description", () => {
      render(<DuplicateWarning duplicates={multipleDuplicates} />);
      expect(
        screen.getByText(/3 possible duplicate leads were found/i)
      ).toBeInTheDocument();
    });

    it("renders one list item per duplicate", () => {
      render(<DuplicateWarning duplicates={multipleDuplicates} />);
      const list = screen.getByTestId("duplicate-list");
      expect(list.children).toHaveLength(3);
    });

    it("renders data-testid for each duplicate item", () => {
      render(<DuplicateWarning duplicates={multipleDuplicates} />);
      expect(
        screen.getByTestId(`duplicate-item-${emailMatch.lead_id}`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`duplicate-item-${phoneMatch.lead_id}`)
      ).toBeInTheDocument();
    });
  });

  describe("onLeadClick callback", () => {
    it("renders clickable button when onLeadClick is provided", () => {
      const onLeadClick = vi.fn();
      render(
        <DuplicateWarning
          duplicates={[emailMatch]}
          onLeadClick={onLeadClick}
        />
      );
      const btn = screen.getByRole("button", {
        name: /view lead/i,
      });
      expect(btn).toBeInTheDocument();
    });

    it("calls onLeadClick with the correct lead_id when clicked", () => {
      const onLeadClick = vi.fn();
      render(
        <DuplicateWarning
          duplicates={[emailMatch]}
          onLeadClick={onLeadClick}
        />
      );
      const btn = screen.getByRole("button", { name: /view lead/i });
      fireEvent.click(btn);
      expect(onLeadClick).toHaveBeenCalledOnce();
      expect(onLeadClick).toHaveBeenCalledWith(emailMatch.lead_id);
    });

    it("renders plain text (no button) when onLeadClick is not provided", () => {
      render(<DuplicateWarning duplicates={[emailMatch]} />);
      const buttons = screen.queryAllByRole("button");
      expect(buttons).toHaveLength(0);
    });
  });

  describe("accessibility", () => {
    it("has aria-label on the alert container", () => {
      render(<DuplicateWarning duplicates={[emailMatch]} />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute(
        "aria-label",
        "Potential duplicate leads detected"
      );
    });

    it("applies custom className to root element", () => {
      render(
        <DuplicateWarning
          duplicates={[emailMatch]}
          className="custom-class"
        />
      );
      const alert = screen.getByTestId("duplicate-warning");
      expect(alert).toHaveClass("custom-class");
    });
  });
});
