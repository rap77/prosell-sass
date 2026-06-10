"""Regression: every ORM model file must be re-exported by the models package.

A model class that defines a real table but is NOT re-exported from
`infrastructure.models.__init__` is invisible to `import *` and therefore
to Alembic autogenerate — `Base.metadata` ends up incomplete and future
`alembic revision --autogenerate` runs silently miss those tables. This
test guards the four models that were previously missing.
"""

import pytest

from prosell.infrastructure import models

PREVIOUSLY_MISSING = (
    "AppointmentModel",
    "FacebookAccountModel",
    "FacebookPageModel",
    "TeamInvitationModel",
)


@pytest.mark.parametrize("model_name", PREVIOUSLY_MISSING)
def test_model_is_listed_in_dunder_all(model_name: str) -> None:
    assert model_name in models.__all__, (
        f"{model_name} is not re-exported in models.__all__ — "
        "it will be invisible to `from ...models import *` and alembic autogenerate"
    )


@pytest.mark.parametrize("model_name", PREVIOUSLY_MISSING)
def test_model_is_importable_from_package(model_name: str) -> None:
    cls = getattr(models, model_name, None)
    assert cls is not None, f"{model_name} cannot be imported from the models package"
    assert hasattr(cls, "__tablename__"), f"{model_name} is not a mapped ORM model"
