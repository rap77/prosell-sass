"""Regression: a wallet persisted through the real ``Wallet.create()``
factory round-trips, tenant isolation is enforced on
``get_by_id(wallet_id, tenant_id)``, and a credit transaction created
by the domain ``credit()`` method (the production path used by Stripe
webhooks) round-trips through the WalletTransaction repo with
``metadata`` deserialized back to a dict.

The wallet_transaction ``metadata`` column is JSONB, and the
``WalletTransaction`` entity has a ``@field_validator`` that handles
both dict and JSON-string input from the ORM. If the validator or the
repo's ``_to_entity`` ever skips the JSON parse, the audit trail UI
shows literal ``"{}"`` strings instead of dicts and the listing-fee
attribution (which reads ``metadata["listing_id"]``) breaks silently.
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.wallet import TransactionType, Wallet
from prosell.infrastructure.repositories.wallet_repository_impl import (
    SqlAlchemyWalletRepository,
    SqlAlchemyWalletTransactionRepository,
)


@pytest.mark.asyncio
async def test_create_wallet_and_credit_transaction_roundtrip(
    db_session,
    test_organization,
):
    """Wallet + credit transaction round-trip; metadata deserialized; tenant isolation."""
    tenant_id = test_organization.tenant_id
    org_id = test_organization.id

    wallet_repo = SqlAlchemyWalletRepository(db_session)
    wallet = await wallet_repo.create(Wallet.create(org_id=org_id, tenant_id=tenant_id))

    # Domain path: wallet.credit() is what the Stripe webhook calls to
    # add tokens. It mutates the wallet in memory AND returns a
    # transaction entity; we persist both via the real repos.
    transaction = wallet.credit(
        amount_cents=5000,
        description="Stripe top-up",
        metadata={"stripe_payment_intent_id": "pi_test_123", "source": "webhook"},
    )
    # Persist the new balance.
    await wallet_repo.update(wallet)

    tx_repo = SqlAlchemyWalletTransactionRepository(db_session)
    created_tx = await tx_repo.create(transaction)

    # Tenant-scoped get_by_id finds it.
    fetched_tx = await tx_repo.get_by_id(created_tx.id, tenant_id)
    assert fetched_tx is not None
    assert fetched_tx.transaction_type == TransactionType.CREDIT
    assert fetched_tx.amount_cents == 5000
    assert fetched_tx.balance_after_cents == 5000
    # Metadata must come back as a dict (JSONB column, parsed by validator).
    assert isinstance(fetched_tx.metadata, dict)
    assert fetched_tx.metadata.get("stripe_payment_intent_id") == "pi_test_123"

    # Wallet balance persisted.
    fetched_wallet = await wallet_repo.get_by_org(org_id, tenant_id)
    assert fetched_wallet is not None
    assert fetched_wallet.balance_cents == 5000

    # Tenant isolation: a different tenant_id must NOT see this wallet.
    other_tenant = uuid4()
    leaked = await wallet_repo.get_by_org(org_id, other_tenant)
    assert leaked is None
