"""UserDealer domain exceptions."""

from uuid import UUID


class UserDealerAlreadyAssignedError(Exception):
    """Raised when user-dealer assignment already exists."""

    def __init__(self, user_id: UUID, dealer_id: UUID):
        self.user_id = user_id
        self.dealer_id = dealer_id
        super().__init__(f"User {user_id} already assigned to dealer {dealer_id}")
