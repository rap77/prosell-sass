"""UserBranch domain exceptions."""

from uuid import UUID


class UserBranchAlreadyAssignedError(Exception):
    """Raised when user-branch assignment already exists."""

    def __init__(self, user_id: UUID, branch_id: UUID):
        self.user_id = user_id
        self.branch_id = branch_id
        super().__init__(f"User {user_id} already assigned to branch {branch_id}")
