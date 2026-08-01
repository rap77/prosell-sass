"""Tests for verify_bot_token dependency."""

import pytest
from fastapi import HTTPException

from prosell.infrastructure.api.dependencies import verify_bot_token


class TestVerifyBotToken:
    """Tests for the bot token authentication dependency."""

    @pytest.fixture(autouse=True)
    def _patch_settings(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Patch settings.fb_bot_api_key for each test."""
        # Default: valid key configured
        monkeypatch.setattr(
            "prosell.infrastructure.api.dependencies.settings.fb_bot_api_key",
            "test-bot-secret-key",
        )

    async def test_valid_token_passes(self) -> None:
        """Valid token should not raise."""
        # No exception = success
        await verify_bot_token(x_bot_token="test-bot-secret-key")

    async def test_missing_token_raises_401(self) -> None:
        """Missing token should raise 401."""
        with pytest.raises(HTTPException) as exc_info:
            await verify_bot_token(x_bot_token=None)

        assert exc_info.value.status_code == 401
        assert "Invalid or missing bot token" in exc_info.value.detail

    async def test_invalid_token_raises_401(self) -> None:
        """Wrong token should raise 401."""
        with pytest.raises(HTTPException) as exc_info:
            await verify_bot_token(x_bot_token="wrong-token")

        assert exc_info.value.status_code == 401
        assert "Invalid or missing bot token" in exc_info.value.detail

    async def test_empty_token_raises_401(self) -> None:
        """Empty string token should raise 401."""
        with pytest.raises(HTTPException) as exc_info:
            await verify_bot_token(x_bot_token="")

        assert exc_info.value.status_code == 401

    async def test_unconfigured_server_raises_503(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Server without FB_BOT_API_KEY should raise 503."""
        monkeypatch.setattr(
            "prosell.infrastructure.api.dependencies.settings.fb_bot_api_key",
            None,
        )

        with pytest.raises(HTTPException) as exc_info:
            await verify_bot_token(x_bot_token="any-token")

        assert exc_info.value.status_code == 503
        assert "Bot auth not configured" in exc_info.value.detail

    async def test_empty_server_key_raises_503(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Server with empty FB_BOT_API_KEY should raise 503."""
        monkeypatch.setattr(
            "prosell.infrastructure.api.dependencies.settings.fb_bot_api_key",
            "",
        )

        with pytest.raises(HTTPException) as exc_info:
            await verify_bot_token(x_bot_token="any-token")

        assert exc_info.value.status_code == 503

    async def test_timing_safe_comparison(self) -> None:
        """Token comparison should be constant-time (uses secrets.compare_digest)."""
        # This is a design test - verify the implementation uses compare_digest
        # by checking that similar-length wrong tokens don't leak timing info.
        # We can't easily test timing, but we verify the function signature
        # matches what we expect for constant-time comparison.
        import inspect

        from prosell.infrastructure.api import dependencies

        source = inspect.getsource(dependencies.verify_bot_token)
        assert "secrets.compare_digest" in source
