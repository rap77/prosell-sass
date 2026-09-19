"""u1-vehicle-catalog-api — GET /categories/facebook-values/{field_key} (BR1.4, Contrato 2).

Calls the router coroutine directly (same pattern as
tests/integration/services/test_vin_decode_integration.py for
vehicle_router.decode_vin) — no FastAPI TestClient / dependency-override
plumbing needed for a handler this small.
"""

import logging
from uuid import uuid4

import pytest
from fastapi import HTTPException

from prosell.domain.entities.user import User
from prosell.infrastructure.api.routers.category_router import get_facebook_value_options


def _make_user() -> User:
    return User(id=uuid4(), email="admin@example.com", full_name="Test Admin")


@pytest.mark.asyncio
async def test_get_facebook_value_options_known_field_key_returns_full_list() -> None:
    response = await get_facebook_value_options(field_key="transmission", current_user=_make_user())

    assert response.field_key == "transmission"
    assert response.options == ["Transmisión automática", "Transmisión manual"]


@pytest.mark.asyncio
async def test_get_facebook_value_options_unknown_field_key_raises_404() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await get_facebook_value_options(field_key="engine_type", current_user=_make_user())

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_facebook_value_options_unknown_field_key_logs_warning(
    caplog: pytest.LogCaptureFixture,
) -> None:
    # BR1.4/Q1 opción A — un field_key no reconocido loguea un warning
    # server-side (distingue un campo genuinamente sin catálogo de un bug
    # de configuración), además del 404.
    with caplog.at_level(logging.WARNING), pytest.raises(HTTPException):
        await get_facebook_value_options(field_key="engine_type", current_user=_make_user())

    assert any("engine_type" in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_get_facebook_value_options_body_type_matches_reconcile_vocabulary() -> None:
    # AC1.2.1 — el mismo vocabulario que usa el decode de VIN (BR1.1/BR1.2),
    # no el enum FacebookFieldKey del frontend.
    response = await get_facebook_value_options(field_key="body_type", current_user=_make_user())

    assert response.options == [
        "SUV",
        "Sedán",
        "Camioneta",
        "Coupé",
        "Hatchback",
        "Convertible",
        "Familiar",
        "Miniván",
        "Auto pequeño",
        "Otro",
    ]
