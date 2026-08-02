# ADR-001: Dealer Onboarding And Marketplace Access

## Status

Accepted

## Context

Dealers own inventory. ProSell provides inventory operations, Marketplace
publication, lead follow-up, and later commission management. Dealers and
brokers must not receive accounts or emails before a ProSell administrator
explicitly decides to invite them.

## Decision

Each dealer is created as an independent organization in
`pending_verification` status. The supplied organization email is stored as a
contact only; it does not create a user or invitation.

Only a ProSell administrator can issue an owner invitation. Accepting that
invitation creates or links the owner user and activates the organization.

Brokers belong to one organization and are created as `pending` contacts.
They cannot be invited while their organization is not active. After owner
activation, a ProSell administrator may issue a broker-specific invitation.
Accepting it creates or links the user to that broker record.

Marketplace access is independent of onboarding. A dealer grants ProSell an
explicit agreement with `can_manage_inventory` and/or
`can_publish_marketplace`. A Facebook account can publish only products
explicitly assigned to it from dealers with active Marketplace authorization.

## Consequences

- Creating a dealer is safe to do before the dealer is ready to onboard.
- Owner and broker invitations need distinct resources and acceptance flows.
- Broker invitation endpoints must reject inactive organizations.
- Product CRUD will enforce active `can_manage_inventory` agreements in the
  next authorization slice.
