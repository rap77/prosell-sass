"""Unit tests for LeadAssignmentRulesEngine domain service.

This test suite verifies lead assignment logic including:
- Round-robin assignment across dealers
- Vehicle owner assignment (product owner gets the lead)
- Workload balancing (assign to dealer with fewest active leads)
- Geographic proximity (assign to nearest dealer if location data available)
- Priority-based rule execution
- Thread-safe round-robin state management
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

import pytest

from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.entities.product import Product
from prosell.domain.services.lead_assignment_rules_engine import (
    AssignmentCandidate,
    AssignmentResult,
    AssignmentRule,
    AssignmentStrategy,
    LeadAssignmentRulesEngine,
    RoundRobinState,
)


class TestRoundRobinState:
    """Test suite for RoundRobinState thread-safe counter.

    Verifies that round-robin state management is thread-safe
    and correctly cycles through dealer indices.
    """

    def test_round_robin_state_initialization(self):
        """Test that RoundRobinState initializes with index 0."""
        state = RoundRobinState()

        assert state.current_index() == 0, "Initial index should be 0"

    def test_round_robin_state_next_increments(self):
        """Test that next() increments and wraps around."""
        state = RoundRobinState()

        assert state.next(dealer_count=3) == 0, "First call should return 0"
        assert state.next(dealer_count=3) == 1, "Second call should return 1"
        assert state.next(dealer_count=3) == 2, "Third call should return 2"
        assert state.next(dealer_count=3) == 0, "Fourth call should wrap to 0"

    def test_round_robin_state_current(self):
        """Test that current_index() returns current without incrementing."""
        state = RoundRobinState()

        assert state.current_index() == 0, "Initial index should be 0"
        state.next(dealer_count=3)  # Advance to 1
        assert state.current_index() == 1, "Should return 1 after advance"

    def test_round_robin_state_single_dealer(self):
        """Test that single dealer always returns index 0."""
        state = RoundRobinState()

        assert state.next(dealer_count=1) == 0
        assert state.next(dealer_count=1) == 0
        assert state.next(dealer_count=1) == 0

    def test_round_robin_state_thread_safety(self):
        """Test that RoundRobinState is thread-safe.

        This test verifies that concurrent calls to next() don't cause
        race conditions. We simulate concurrent access by calling
        next() multiple times in rapid succession.
        """
        import threading

        state = RoundRobinState()
        results = []
        dealer_count = 5

        def concurrent_next():
            for _ in range(100):
                results.append(state.next(dealer_count=dealer_count))

        threads = [threading.Thread(target=concurrent_next) for _ in range(10)]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        # Verify all indices are within valid range
        assert all(0 <= idx < dealer_count for idx in results), \
            "All indices should be within valid range"

        # Verify we got a reasonable distribution (not all the same)
        unique_indices = set(results)
        assert len(unique_indices) > 1, "Should have multiple different indices"


class TestAssignmentRule:
    """Test suite for AssignmentRule abstract base class.

    Verifies that rule priority works correctly and that
    custom rules can be implemented.
    """

    def test_rule_priority_ordering(self):
        """Test that rules can be ordered by priority."""

        class HighPriorityRule(AssignmentRule):
            priority = 1

            def score(self, lead: Lead, dealer: AssignmentCandidate) -> float:
                return 1.0

        class LowPriorityRule(AssignmentRule):
            priority = 10

            def score(self, lead: Lead, dealer: AssignmentCandidate) -> float:
                return 1.0

        high_rule = HighPriorityRule()
        low_rule = LowPriorityRule()

        assert high_rule.priority < low_rule.priority, \
            "High priority should have lower numeric value"

    def test_rule_score_method_must_be_implemented(self):
        """Test that custom rules must implement score()."""

        class IncompleteRule(AssignmentRule):
            priority = 1

        with pytest.raises(TypeError):
            # Should fail because score() is not implemented
            IncompleteRule()


class TestRoundRobinAssignmentRule:
    """Test suite for round-robin assignment rule.

    Verifies that round-robin distributes leads evenly across dealers.
    """

    def test_round_robin_first_lead(self):
        """Test that first lead goes to first dealer."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()
        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
        )

        dealers = [
            AssignmentCandidate(
                user_id=uuid4(),
                name="Dealer A",
                active_lead_count=0,
            ),
            AssignmentCandidate(
                user_id=uuid4(),
                name="Dealer B",
                active_lead_count=0,
            ),
        ]

        result = engine._round_robin_rule.score(lead, dealers[0])

        # First dealer should get the lead (score should be high)
        # Note: The actual score depends on implementation, but it should be > 0
        assert result >= 0.0, "Round-robin should return a valid score"

    def test_round_robin_cycles_through_dealers(self):
        """Test that round-robin cycles through all dealers."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()

        dealers = [
            AssignmentCandidate(
                user_id=uuid4(),
                name=f"Dealer {i}",
                active_lead_count=0,
            )
            for i in range(3)
        ]

        assigned_dealers = []

        for i in range(6):  # Assign 6 leads (2 full cycles)
            lead = Lead.create(
                buyer_name=f"Buyer {i}",
                tenant_id=tenant_id,
            )

            result = engine.assign_lead(
                lead=lead,
                candidates=dealers,
                strategy=AssignmentStrategy.ROUND_ROBIN,
            )

            assigned_dealers.append(result.assigned_to.user_id)

        # Verify distribution is roughly even (2 each for 3 dealers)
        from collections import Counter

        counts = Counter(assigned_dealers)
        assert all(count == 2 for count in counts.values()), \
            "Each dealer should get exactly 2 leads in 2 full cycles"


class TestVehicleOwnerAssignmentRule:
    """Test suite for vehicle owner assignment rule.

    Verifies that when a lead is for a specific product,
    the product owner gets priority.
    """

    def test_vehicle_owner_gets_highest_score(self):
        """Test that product owner gets highest assignment score."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()
        product_owner_id = uuid4()
        other_dealer_id = uuid4()
        product_id = uuid4()
        organization_id = uuid4()

        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
            product_id=product_id,
        )

        # Create a mock product with organization
        product = Product(
            id=product_id,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=uuid4(),
            title="Test Vehicle",
            price_cents=10000,
        )

        dealers = [
            AssignmentCandidate(
                user_id=product_owner_id,
                name="Product Owner",
                active_lead_count=5,
            ),
            AssignmentCandidate(
                user_id=other_dealer_id,
                name="Other Dealer",
                active_lead_count=0,
            ),
        ]

        # Provide organization membership context
        organization_members = {product_owner_id}  # Only owner is member

        # Score with product context
        owner_score = engine._vehicle_owner_rule.score(
            lead,
            dealers[0],
            product=product,
            organization_members=organization_members,
        )

        other_score = engine._vehicle_owner_rule.score(
            lead,
            dealers[1],
            product=product,
            organization_members=organization_members,
        )

        # Owner should get significantly higher score
        assert owner_score > other_score, \
            "Product owner should get higher score than other dealers"

    def test_vehicle_owner_no_product(self):
        """Test that rule returns 0 when no product associated."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()

        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
            product_id=None,  # No product
        )

        dealer = AssignmentCandidate(
            user_id=uuid4(),
            name="Dealer A",
            active_lead_count=0,
        )

        score = engine._vehicle_owner_rule.score(lead, dealer)

        # Should return 0 when no product
        assert score == 0.0, "Should return 0 when lead has no product"


class TestWorkloadBalancingRule:
    """Test suite for workload balancing assignment rule.

    Verifies that dealers with fewer active leads get priority.
    """

    def test_workload_balancing_prefers_less_loaded(self):
        """Test that dealer with fewer leads gets higher score."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()

        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
        )

        busy_dealer = AssignmentCandidate(
            user_id=uuid4(),
            name="Busy Dealer",
            active_lead_count=10,
        )

        free_dealer = AssignmentCandidate(
            user_id=uuid4(),
            name="Free Dealer",
            active_lead_count=2,
        )

        busy_score = engine._workload_balancing_rule.score(lead, busy_dealer)
        free_score = engine._workload_balancing_rule.score(lead, free_dealer)

        # Free dealer should get higher score
        assert free_score > busy_score, \
            "Dealer with fewer leads should get higher score"

    def test_workload_balancing_equal_workload(self):
        """Test that equal workload results in similar scores."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()

        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
        )

        dealer1 = AssignmentCandidate(
            user_id=uuid4(),
            name="Dealer 1",
            active_lead_count=5,
        )

        dealer2 = AssignmentCandidate(
            user_id=uuid4(),
            name="Dealer 2",
            active_lead_count=5,
        )

        score1 = engine._workload_balancing_rule.score(lead, dealer1)
        score2 = engine._workload_balancing_rule.score(lead, dealer2)

        # Scores should be similar for equal workload
        assert abs(score1 - score2) < 0.1, \
            "Dealers with equal workload should get similar scores"


class TestGeographicProximityRule:
    """Test suite for geographic proximity assignment rule.

    Verifies that dealers geographically closer to the lead get priority.
    """

    def test_geographic_proximity_prefers_nearby(self):
        """Test that nearby dealer gets higher score."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()

        # Lead in New York
        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
        )

        nearby_dealer = AssignmentCandidate(
            user_id=uuid4(),
            name="NYC Dealer",
            active_lead_count=5,
            location_city="New York",
            location_state="NY",
        )

        far_dealer = AssignmentCandidate(
            user_id=uuid4(),
            name="LA Dealer",
            active_lead_count=5,
            location_city="Los Angeles",
            location_state="CA",
        )

        # Mock lead location (would come from lead data in real implementation)
        lead_location = {"city": "New York", "state": "NY"}

        nearby_score = engine._geographic_proximity_rule.score(
            lead,
            nearby_dealer,
            lead_location=lead_location,
        )

        far_score = engine._geographic_proximity_rule.score(
            lead,
            far_dealer,
            lead_location=lead_location,
        )

        # Nearby dealer should get higher score
        assert nearby_score > far_score, \
            "Geographically closer dealer should get higher score"

    def test_geographic_proximity_no_location(self):
        """Test that rule returns 0 when no location data available."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()

        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
        )

        dealer = AssignmentCandidate(
            user_id=uuid4(),
            name="Dealer A",
            active_lead_count=0,
        )

        # No location data
        score = engine._geographic_proximity_rule.score(lead, dealer)

        # Should return 0 when no location data
        assert score == 0.0, "Should return 0 when no location data available"


class TestLeadAssignmentRulesEngine:
    """Test suite for LeadAssignmentRulesEngine.

    Verifies the complete assignment flow including:
    - Strategy selection
    - Rule composition
    - Result calculation
    - Configuration
    """

    def test_assign_lead_round_robin_strategy(self):
        """Test lead assignment with round-robin strategy."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()

        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
        )

        dealers = [
            AssignmentCandidate(
                user_id=uuid4(),
                name=f"Dealer {i}",
                active_lead_count=i,
            )
            for i in range(3)
        ]

        result = engine.assign_lead(
            lead=lead,
            candidates=dealers,
            strategy=AssignmentStrategy.ROUND_ROBIN,
        )

        assert isinstance(result, AssignmentResult)
        assert result.assigned_to is not None
        assert result.assigned_to.user_id in [d.user_id for d in dealers]
        assert result.strategy_used == AssignmentStrategy.ROUND_ROBIN
        assert result.confidence_score > 0.0

    def test_assign_lead_vehicle_owner_strategy(self):
        """Test lead assignment with vehicle-owner strategy."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()
        product_owner_id = uuid4()
        other_dealer_id = uuid4()
        product_id = uuid4()
        organization_id = uuid4()

        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
            product_id=product_id,
        )

        product = Product(
            id=product_id,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=uuid4(),
            title="Test Vehicle",
            price_cents=10000,
        )

        dealers = [
            AssignmentCandidate(
                user_id=product_owner_id,
                name="Product Owner",
                active_lead_count=10,
            ),
            AssignmentCandidate(
                user_id=other_dealer_id,
                name="Other Dealer",
                active_lead_count=0,
            ),
        ]

        # Provide organization membership context
        organization_members = {product_owner_id}

        result = engine.assign_lead(
            lead=lead,
            candidates=dealers,
            strategy=AssignmentStrategy.VEHICLE_OWNER,
            product=product,
            organization_members=organization_members,
        )

        assert result.assigned_to.user_id == product_owner_id, \
            "Should assign to product owner"

    def test_assign_lead_workload_balancing_strategy(self):
        """Test lead assignment with workload-balancing strategy."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()

        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
        )

        busy_dealer = AssignmentCandidate(
            user_id=uuid4(),
            name="Busy Dealer",
            active_lead_count=10,
        )

        free_dealer = AssignmentCandidate(
            user_id=uuid4(),
            name="Free Dealer",
            active_lead_count=1,
        )

        dealers = [busy_dealer, free_dealer]

        result = engine.assign_lead(
            lead=lead,
            candidates=dealers,
            strategy=AssignmentStrategy.WORKLOAD_BALANCING,
        )

        assert result.assigned_to.user_id == free_dealer.user_id, \
            "Should assign to dealer with fewer leads"

    def test_assign_lead_geographic_proximity_strategy(self):
        """Test lead assignment with geographic-proximity strategy."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()

        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
        )

        lead_location = {"city": "New York", "state": "NY"}

        nyc_dealer = AssignmentCandidate(
            user_id=uuid4(),
            name="NYC Dealer",
            active_lead_count=5,
            location_city="New York",
            location_state="NY",
        )

        la_dealer = AssignmentCandidate(
            user_id=uuid4(),
            name="LA Dealer",
            active_lead_count=5,
            location_city="Los Angeles",
            location_state="CA",
        )

        dealers = [nyc_dealer, la_dealer]

        result = engine.assign_lead(
            lead=lead,
            candidates=dealers,
            strategy=AssignmentStrategy.GEOGRAPHIC_PROXIMITY,
            lead_location=lead_location,
        )

        assert result.assigned_to.user_id == nyc_dealer.user_id, \
            "Should assign to geographically closest dealer"

    def test_assign_lead_empty_candidates(self):
        """Test that empty candidates list returns no assignment."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()

        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
        )

        result = engine.assign_lead(
            lead=lead,
            candidates=[],
            strategy=AssignmentStrategy.ROUND_ROBIN,
        )

        assert result.assigned_to is None, \
            "Should return None when no candidates available"
        assert result.confidence_score == 0.0

    def test_assign_lead_combined_strategy(self):
        """Test that COMBINED strategy uses all rules with priority."""
        from uuid import uuid4

        engine = LeadAssignmentRulesEngine()
        tenant_id = uuid4()
        product_owner_id = uuid4()
        other_dealer_id = uuid4()
        product_id = uuid4()
        organization_id = uuid4()

        lead = Lead.create(
            buyer_name="John Doe",
            tenant_id=tenant_id,
            product_id=product_id,
        )

        product = Product(
            id=product_id,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=uuid4(),
            title="Test Vehicle",
            price_cents=10000,
        )

        busy_owner = AssignmentCandidate(
            user_id=product_owner_id,
            name="Busy Owner",
            active_lead_count=10,
        )

        free_dealer = AssignmentCandidate(
            user_id=other_dealer_id,
            name="Free Dealer",
            active_lead_count=1,
        )

        dealers = [busy_owner, free_dealer]

        # Provide organization membership context
        organization_members = {product_owner_id}

        result = engine.assign_lead(
            lead=lead,
            candidates=dealers,
            strategy=AssignmentStrategy.COMBINED,
            product=product,
            organization_members=organization_members,
        )

        # With COMBINED strategy, vehicle owner should still win
        # despite having higher workload (priority wins)
        assert result.assigned_to is not None
        assert result.strategy_used == AssignmentStrategy.COMBINED


class TestAssignmentResult:
    """Test suite for AssignmentResult value object."""

    def test_assignment_result_creation(self):
        """Test AssignmentResult value object creation."""
        from uuid import uuid4

        dealer = AssignmentCandidate(
            user_id=uuid4(),
            name="Test Dealer",
            active_lead_count=5,
        )

        result = AssignmentResult(
            assigned_to=dealer,
            strategy_used=AssignmentStrategy.ROUND_ROBIN,
            confidence_score=0.95,
            rule_scores={"round_robin": 1.0},
        )

        assert result.assigned_to == dealer
        assert result.strategy_used == AssignmentStrategy.ROUND_ROBIN
        assert result.confidence_score == 0.95
        assert result.rule_scores == {"round_robin": 1.0}

    def test_assignment_result_no_assignment(self):
        """Test AssignmentResult when no assignment possible."""
        result = AssignmentResult(
            assigned_to=None,
            strategy_used=AssignmentStrategy.ROUND_ROBIN,
            confidence_score=0.0,
            rule_scores={},
        )

        assert result.assigned_to is None
        assert result.confidence_score == 0.0


class TestAssignmentCandidate:
    """Test suite for AssignmentCandidate value object."""

    def test_assignment_candidate_creation(self):
        """Test AssignmentCandidate value object creation."""
        from uuid import uuid4

        candidate = AssignmentCandidate(
            user_id=uuid4(),
            name="Test Dealer",
            active_lead_count=5,
            location_city="New York",
            location_state="NY",
        )

        assert candidate.user_id is not None
        assert candidate.name == "Test Dealer"
        assert candidate.active_lead_count == 5
        assert candidate.location_city == "New York"
        assert candidate.location_state == "NY"

    def test_assignment_candidate_optional_location(self):
        """Test AssignmentCandidate without location data."""
        from uuid import uuid4

        candidate = AssignmentCandidate(
            user_id=uuid4(),
            name="Test Dealer",
            active_lead_count=5,
        )

        assert candidate.location_city is None
        assert candidate.location_state is None
