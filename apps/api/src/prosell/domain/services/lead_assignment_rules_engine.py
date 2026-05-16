"""Lead assignment rules engine domain service.

This service is responsible for assigning leads to dealers based on
configurable rules and strategies. It follows Clean Architecture
principles as a domain service with no external dependencies.

Assignment strategies:
- ROUND_ROBIN: Distribute leads evenly across dealers
- VEHICLE_OWNER: Assign to the product/vehicle owner
- WORKLOAD_BALANCING: Assign to dealer with fewest active leads
- GEOGRAPHIC_PROXIMITY: Assign to nearest dealer (if location data available)
- COMBINED: Use all rules with priority-based scoring

Thread safety:
- Round-robin state management uses threading.Lock for concurrent safety
"""

import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import StrEnum
from typing import Any
from uuid import UUID

from prosell.domain.entities.lead import Lead


class AssignmentStrategy(StrEnum):
    """Lead assignment strategies."""

    ROUND_ROBIN = "round_robin"
    VEHICLE_OWNER = "vehicle_owner"
    WORKLOAD_BALANCING = "workload_balancing"
    GEOGRAPHIC_PROXIMITY = "geographic_proximity"
    COMBINED = "combined"


@dataclass
class AssignmentCandidate:
    """Value object representing a dealer candidate for lead assignment.

    Attributes:
        user_id: Unique identifier for the dealer/user
        name: Human-readable name
        active_lead_count: Current number of active leads assigned
        location_city: City where dealer is located (optional)
        location_state: State/province where dealer is located (optional)
    """

    user_id: UUID
    name: str
    active_lead_count: int
    location_city: str | None = None
    location_state: str | None = None


@dataclass
class AssignmentResult:
    """Value object representing the result of lead assignment.

    Attributes:
        assigned_to: The dealer candidate selected (None if no assignment)
        strategy_used: Which assignment strategy was applied
        confidence_score: How confident the assignment is (0.0 to 1.0)
        rule_scores: Individual scores from each rule (for transparency)
    """

    assigned_to: AssignmentCandidate | None
    strategy_used: AssignmentStrategy
    confidence_score: float
    rule_scores: dict[str, float]


class RoundRobinState:
    """
    Thread-safe round-robin state management.

    Uses a lock to ensure thread-safe increments of the dealer index.
    This is critical for concurrent lead assignment scenarios.
    """

    def __init__(self) -> None:
        """Initialize round-robin state with index 0."""
        self._index = 0
        self._lock = threading.Lock()

    def current_index(self) -> int:
        """Get the current index without incrementing.

        Returns:
            Current dealer index
        """
        with self._lock:
            return self._index

    def next(self, dealer_count: int) -> int:
        """
        Get the next dealer index and increment.

        Thread-safe operation that cycles through available dealers.

        Args:
            dealer_count: Total number of available dealers

        Returns:
            Next dealer index (0 to dealer_count - 1)
        """
        with self._lock:
            if dealer_count <= 0:
                raise ValueError("dealer_count must be positive")

            current = self._index
            self._index = (self._index + 1) % dealer_count
            _ = dealer_count  # Mark as used to avoid linter warning
            return current

    def next_index(self, dealer_count: int) -> int:
        """
        Advance to the next index without returning the current one.

        This is a convenience method for advancing the round-robin state
        after an assignment has been made.

        Args:
            dealer_count: Total number of available dealers

        Returns:
            The new index value after incrementing
        """
        return self.next(dealer_count)


class AssignmentRule(ABC):
    """
    Abstract base class for lead assignment rules.

    Each rule implements a scoring algorithm that evaluates how well
    a dealer matches a lead for assignment. Rules have priority to
    support combined strategy execution.
    """

    # Lower number = higher priority (1 is highest)
    priority: int = 100

    @abstractmethod
    def score(
        self,
        lead: Lead,
        candidate: AssignmentCandidate,
        **context: Any,
    ) -> float:
        """
        Calculate assignment score for a candidate dealer.

        Args:
            lead: The lead to assign
            candidate: The dealer candidate to evaluate
            **context: Additional context (product, location, etc.)

        Returns:
            Score from 0.0 (poor match) to 1.0 (perfect match)
        """
        pass


class RoundRobinAssignmentRule(AssignmentRule):
    """
    Round-robin assignment rule.

    Distributes leads evenly across all dealers by cycling through
    them in order. Uses thread-safe RoundRobinState for concurrency.
    """

    priority = 10  # Low priority (fallback)

    def __init__(self) -> None:
        """Initialize rule with round-robin state."""
        self.state = RoundRobinState()

    def score(
        self,
        lead: Lead,  # noqa: ARG002
        candidate: AssignmentCandidate,  # noqa: ARG002
        **context: Any,
    ) -> float:
        """
        Score based on round-robin position.

        The dealer at the current round-robin index gets score 1.0,
        all others get 0.0.

        Args:
            lead: The lead to assign
            candidate: The dealer candidate to evaluate
            **context: Must include 'candidate_index' and 'dealer_count'

        Returns:
            1.0 if this candidate is next in round-robin, 0.0 otherwise
        """
        candidate_index = context.get("candidate_index", 0)
        _ = context.get("dealer_count", 1)  # Used for validation, not needed for scoring

        current_index = self.state.current_index()

        # Return 1.0 if this candidate is at the current round-robin position
        return 1.0 if candidate_index == current_index else 0.0


class VehicleOwnerAssignmentRule(AssignmentRule):
    """
    Vehicle owner assignment rule.

    When a lead is associated with a specific product/vehicle,
    the owner of that vehicle gets highest priority for assignment.

    Note: This rule requires organization membership context to work.
    The Product entity has organization_id, so we need to know which
    dealers belong to that organization to determine ownership.
    """

    priority = 1  # Highest priority

    def score(
        self,
        lead: Lead,
        candidate: AssignmentCandidate,
        **context: Any,
    ) -> float:
        """
        Score based on vehicle ownership.

        Args:
            lead: The lead to assign
            candidate: The dealer candidate to evaluate
            **context: Must include 'product' (Product entity)
                      May include 'organization_members' (set of user IDs)

        Returns:
            1.0 if candidate owns the lead's vehicle, 0.0 otherwise
        """
        # If lead has no product, this rule doesn't apply
        if lead.product_id is None:
            return 0.0

        # Check if product context is provided
        product = context.get("product")
        if product is None:
            return 0.0

        # Prefer explicit product ownership when available
        product_owner_id = getattr(product, "submitted_by", None) or getattr(product, "approved_by", None)
        if product_owner_id is not None:
            return 1.0 if candidate.user_id == product_owner_id else 0.0

        # Check if organization members context is provided
        organization_members = context.get("organization_members")
        if organization_members is None:
            # No membership data available, can't determine ownership
            return 0.0

        # Check if candidate is a member of the product's organization
        if candidate.user_id in organization_members:
            return 1.0

        return 0.0


class WorkloadBalancingAssignmentRule(AssignmentRule):
    """
    Workload balancing assignment rule.

    Assigns leads to dealers with the fewest active leads to
    ensure even distribution of work.
    """

    priority = 3  # Medium-high priority

    def score(
        self,
        lead: Lead,  # noqa: ARG002
        candidate: AssignmentCandidate,
        **context: Any,
    ) -> float:
        """
        Score inversely proportional to active lead count.

        Args:
            lead: The lead to assign
            candidate: The dealer candidate to evaluate
            **context: May include 'max_workload' for normalization

        Returns:
            Score from 0.0 to 1.0, higher for less loaded dealers
        """
        max_workload = context.get("max_workload", 20)  # Default max for normalization

        if max_workload <= 0:
            max_workload = 1

        # Inverse score: fewer leads = higher score
        # Score = 1.0 - (active_leads / max_workload)
        # Clamped to [0.0, 1.0]
        workload_ratio = candidate.active_lead_count / max_workload
        score = 1.0 - min(workload_ratio, 1.0)

        return max(score, 0.0)


class GeographicProximityAssignmentRule(AssignmentRule):
    """
    Geographic proximity assignment rule.

    Assigns leads to the geographically closest dealer when
    location data is available for both lead and dealer.
    """

    priority = 5  # Medium priority

    def score(
        self,
        lead: Lead,  # noqa: ARG002
        candidate: AssignmentCandidate,
        **context: Any,
    ) -> float:
        """
        Score based on geographic proximity.

        Args:
            lead: The lead to assign
            candidate: The dealer candidate to evaluate
            **context: May include 'lead_location' dict with city/state

        Returns:
            Score from 0.0 to 1.0, higher for closer locations
        """
        # Check if lead location is provided
        lead_location = context.get("lead_location")
        if lead_location is None:
            return 0.0

        # Check if candidate has location
        if candidate.location_city is None or candidate.location_state is None:
            return 0.0

        # Simple proximity: same state = 0.5, same city = 1.0
        lead_city = lead_location.get("city", "").lower()
        lead_state = lead_location.get("state", "").lower()

        candidate_city = candidate.location_city.lower()
        candidate_state = candidate.location_state.lower()

        # Same city and state = perfect match
        if lead_city == candidate_city and lead_state == candidate_state:
            return 1.0

        # Same state only = partial match
        if lead_state == candidate_state:
            return 0.5

        # Different state = no match
        return 0.0


class LeadAssignmentRulesEngine:
    """
    Domain service for lead assignment using configurable rules.

    This service encapsulates the logic for assigning leads to dealers
    based on multiple strategies and rules. It follows Clean Architecture
    by being a pure domain service with no external dependencies.

    Usage:
        engine = LeadAssignmentRulesEngine()
        result = engine.assign_lead(
            lead=lead,
            candidates=dealers,
            strategy=AssignmentStrategy.ROUND_ROBIN
        )
    """

    def __init__(self) -> None:
        """Initialize engine with default rules."""
        self._round_robin_rule = RoundRobinAssignmentRule()
        self._vehicle_owner_rule = VehicleOwnerAssignmentRule()
        self._workload_balancing_rule = WorkloadBalancingAssignmentRule()
        self._geographic_proximity_rule = GeographicProximityAssignmentRule()

        # Sort rules by priority (lower number = higher priority)
        self._rules = [
            self._vehicle_owner_rule,
            self._workload_balancing_rule,
            self._geographic_proximity_rule,
            self._round_robin_rule,
        ]

    def assign_lead(
        self,
        lead: Lead,
        candidates: list[AssignmentCandidate],
        strategy: AssignmentStrategy,
        **context: Any,
    ) -> AssignmentResult:
        """
        Assign a lead to a dealer using the specified strategy.

        Args:
            lead: The lead to assign
            candidates: List of dealer candidates
            strategy: Assignment strategy to use
            **context: Additional context (product, location, etc.)

        Returns:
            AssignmentResult with selected dealer and metadata

        Example:
            >>> engine = LeadAssignmentRulesEngine()
            >>> result = engine.assign_lead(
            ...     lead=lead,
            ...     candidates=dealers,
            ...     strategy=AssignmentStrategy.ROUND_ROBIN
            ... )
            >>> print(f"Assigned to: {result.assigned_to.name}")
        """
        if not candidates:
            return AssignmentResult(
                assigned_to=None,
                strategy_used=strategy,
                confidence_score=0.0,
                rule_scores={},
            )

        if strategy == AssignmentStrategy.ROUND_ROBIN:
            return self._assign_round_robin(lead, candidates, context)
        elif strategy == AssignmentStrategy.VEHICLE_OWNER:
            return self._assign_vehicle_owner(lead, candidates, context)
        elif strategy == AssignmentStrategy.WORKLOAD_BALANCING:
            return self._assign_workload_balancing(lead, candidates, context)
        elif strategy == AssignmentStrategy.GEOGRAPHIC_PROXIMITY:
            return self._assign_geographic_proximity(lead, candidates, context)
        elif strategy == AssignmentStrategy.COMBINED:
            return self._assign_combined(lead, candidates, context)
        else:
            # Default to round-robin
            return self._assign_round_robin(lead, candidates, context)

    def _assign_round_robin(
        self,
        lead: Lead,
        candidates: list[AssignmentCandidate],
        context: dict[str, Any],  # noqa: ARG002
    ) -> AssignmentResult:
        """Assign using round-robin strategy."""
        dealer_count = len(candidates)
        rule_scores: dict[str, float] = {}

        # Score each candidate
        for idx, candidate in enumerate(candidates):
            score = self._round_robin_rule.score(
                lead,
                candidate,
                candidate_index=idx,
                dealer_count=dealer_count,
            )
            rule_scores[candidate.user_id.hex] = score

        # Find the candidate with highest score
        best_candidate = max(candidates, key=lambda c: rule_scores[c.user_id.hex])

        # Advance round-robin state for next assignment
        self._round_robin_rule.state.next(dealer_count)

        return AssignmentResult(
            assigned_to=best_candidate,
            strategy_used=AssignmentStrategy.ROUND_ROBIN,
            confidence_score=rule_scores[best_candidate.user_id.hex],
            rule_scores={"round_robin": rule_scores[best_candidate.user_id.hex]},
        )

    def _assign_vehicle_owner(
        self,
        lead: Lead,
        candidates: list[AssignmentCandidate],
        context: dict[str, Any],
    ) -> AssignmentResult:
        """Assign using vehicle owner strategy."""
        product = context.get("product")

        if lead.product_id is None or product is None:
            # Fall back to round-robin if no product
            return self._assign_round_robin(lead, candidates, context)

        # Score each candidate
        rule_scores: dict[str, float] = {}
        for candidate in candidates:
            score = self._vehicle_owner_rule.score(
                lead,
                candidate,
                product=product,
            )
            rule_scores[candidate.user_id.hex] = score

        # Find the candidate with highest score
        best_candidate = max(candidates, key=lambda c: rule_scores[c.user_id.hex])

        return AssignmentResult(
            assigned_to=best_candidate,
            strategy_used=AssignmentStrategy.VEHICLE_OWNER,
            confidence_score=rule_scores[best_candidate.user_id.hex],
            rule_scores={"vehicle_owner": rule_scores[best_candidate.user_id.hex]},
        )

    def _assign_workload_balancing(
        self,
        lead: Lead,
        candidates: list[AssignmentCandidate],
        context: dict[str, Any],
    ) -> AssignmentResult:
        """Assign using workload balancing strategy."""
        # Calculate max workload for normalization
        max_workload = max(c.active_lead_count for c in candidates) if candidates else 1
        context["max_workload"] = max(max_workload, 1)

        # Score each candidate
        rule_scores: dict[str, float] = {}
        for candidate in candidates:
            score = self._workload_balancing_rule.score(
                lead,
                candidate,
                max_workload=context["max_workload"],
            )
            rule_scores[candidate.user_id.hex] = score

        # Find the candidate with highest score
        best_candidate = max(candidates, key=lambda c: rule_scores[c.user_id.hex])

        return AssignmentResult(
            assigned_to=best_candidate,
            strategy_used=AssignmentStrategy.WORKLOAD_BALANCING,
            confidence_score=rule_scores[best_candidate.user_id.hex],
            rule_scores={"workload_balancing": rule_scores[best_candidate.user_id.hex]},
        )

    def _assign_geographic_proximity(
        self,
        lead: Lead,
        candidates: list[AssignmentCandidate],
        context: dict[str, Any],
    ) -> AssignmentResult:
        """Assign using geographic proximity strategy."""
        lead_location = context.get("lead_location")

        if lead_location is None:
            # Fall back to round-robin if no location data
            return self._assign_round_robin(lead, candidates, context)

        # Score each candidate
        rule_scores: dict[str, float] = {}
        for candidate in candidates:
            score = self._geographic_proximity_rule.score(
                lead,
                candidate,
                lead_location=lead_location,
            )
            rule_scores[candidate.user_id.hex] = score

        # Find the candidate with highest score
        best_candidate = max(candidates, key=lambda c: rule_scores[c.user_id.hex])

        return AssignmentResult(
            assigned_to=best_candidate,
            strategy_used=AssignmentStrategy.GEOGRAPHIC_PROXIMITY,
            confidence_score=rule_scores[best_candidate.user_id.hex],
            rule_scores={"geographic_proximity": rule_scores[best_candidate.user_id.hex]},
        )

    def _assign_combined(
        self,
        lead: Lead,
        candidates: list[AssignmentCandidate],
        context: dict[str, Any],
    ) -> AssignmentResult:
        """Assign using combined strategy with all rules."""
        if not candidates:
            return AssignmentResult(
                assigned_to=None,
                strategy_used=AssignmentStrategy.COMBINED,
                confidence_score=0.0,
                rule_scores={},
            )

        # Score each candidate using all rules
        all_rule_scores: dict[str, dict[str, float]] = {
            candidate.user_id.hex: {} for candidate in candidates
        }

        dealer_count = len(candidates)
        for rule in self._rules:
            rule_name = rule.__class__.__name__
            for idx, candidate in enumerate(candidates):
                score = rule.score(
                    lead, candidate,
                    candidate_index=idx,
                    dealer_count=dealer_count,
                    **context,
                )
                all_rule_scores[candidate.user_id.hex][rule_name] = score

        # Calculate weighted score for each candidate
        # Higher priority rules get more weight
        candidate_scores: dict[str, float] = {}
        for candidate in candidates:
            user_id = candidate.user_id.hex
            weighted_score = 0.0
            total_weight = 0.0

            for rule in self._rules:
                rule_name = rule.__class__.__name__
                rule_score = all_rule_scores[user_id].get(rule_name, 0.0)
                # Weight is inverse of priority (lower priority number = higher weight)
                weight = 1.0 / rule.priority
                weighted_score += rule_score * weight
                total_weight += weight

            # Normalize by total weight
            candidate_scores[user_id] = (
                weighted_score / total_weight if total_weight > 0 else 0.0
            )

        # Find the candidate with highest weighted score
        best_candidate = max(
            candidates,
            key=lambda c: candidate_scores[c.user_id.hex],
        )

        # Advance round-robin state for the next call
        self._round_robin_rule.state.next(len(candidates))

        return AssignmentResult(
            assigned_to=best_candidate,
            strategy_used=AssignmentStrategy.COMBINED,
            confidence_score=candidate_scores[best_candidate.user_id.hex],
            rule_scores=all_rule_scores[best_candidate.user_id.hex],
        )
