"""Regression tests for docker-compose configuration.

These tests guard the local dev stack from configuration drift. They parse
`docker/docker-compose.yml` and assert that the contract documented in
the project (api service loads `.env` so DATABASE_URL, ADMIN_*, etc.
are available inside the container) is upheld.

Origin: 2026-06-04 — POST /api/v1/auth/login returned 500 because the
`api` service had no `env_file:`, so DATABASE_URL fell back to
`localhost:5432` (not resolvable from inside the container) and asyncpg
raised ConnectionRefusedError on every DB-touching endpoint.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parents[4]
COMPOSE_PATH = REPO_ROOT / "docker" / "docker-compose.yml"


@pytest.fixture(scope="module")
def compose() -> dict:
    """Parse docker-compose.yml once per module."""
    assert COMPOSE_PATH.exists(), f"docker-compose.yml not found at {COMPOSE_PATH}"
    with COMPOSE_PATH.open() as f:
        return yaml.safe_load(f)


def _env_as_dict(env_value: list[str] | dict | None) -> dict[str, str]:
    """Convert docker-compose `environment` (list of "KEY=VAL" or dict) to dict."""
    if env_value is None:
        return {}
    if isinstance(env_value, dict):
        return {str(k): str(v) for k, v in env_value.items()}
    out: dict[str, str] = {}
    for item in env_value:
        if "=" in item:
            k, v = item.split("=", 1)
            out[k] = v
    return out


class TestApiServiceConfig:
    """Contract: the `api` service must load .env to get critical runtime config."""

    def test_api_service_loads_dotenv(self, compose: dict) -> None:
        """The api service must have env_file: - .env in docker-compose.yml.

        Without this, DATABASE_URL and other secrets defined only in .env
        are unavailable inside the container, causing ConnectionRefusedError
        on the first DB query.
        """
        api = compose["services"]["api"]
        env_file = api.get("env_file") or []
        # env_file can be a string or a list
        env_files = [env_file] if isinstance(env_file, str) else list(env_file)
        assert (
            ".env" in env_files
        ), f"api service must load .env via env_file. Current env_file={env_file!r}"

    def test_api_service_has_redis_url_override(self, compose: dict) -> None:
        """REDIS_URL must point to the `redis` service inside the docker network.

        Even with env_file, we keep an explicit override for safety.
        """
        api = compose["services"]["api"]
        env = _env_as_dict(api.get("environment"))
        assert env.get("REDIS_URL", "").startswith(
            "redis://"
        ), f"REDIS_URL must use redis:// scheme. Got: {env.get('REDIS_URL')!r}"

    def test_api_service_depends_on_minio_healthchecks(self, compose: dict) -> None:
        """api must wait for minio (healthy) and minio-init (completed)."""
        api = compose["services"]["api"]
        depends = api.get("depends_on", {})
        assert "minio" in depends, "api must depend_on minio"
        assert "minio-init" in depends, "api must depend_on minio-init"

        minio_cond = depends["minio"]
        if isinstance(minio_cond, dict):
            assert (
                minio_cond.get("condition") == "service_healthy"
            ), f"minio dependency must require service_healthy. Got: {minio_cond!r}"

        init_cond = depends["minio-init"]
        if isinstance(init_cond, dict):
            assert init_cond.get("condition") == "service_completed_successfully", (
                f"minio-init dependency must require service_completed_successfully. "
                f"Got: {init_cond!r}"
            )

    def test_compose_declares_minio_volume(self, compose: dict) -> None:
        """The minio_data named volume must exist for data persistence across restarts."""
        volumes = compose.get("volumes", {}) or {}
        assert "minio_data" in volumes, "volumes section must declare minio_data"

    def test_compose_declares_minio_init_service(self, compose: dict) -> None:
        """The minio-init service must exist to bootstrap the bucket on first run."""
        services = compose.get("services", {})
        assert (
            "minio-init" in services
        ), "minio-init service is required to auto-create the bucket on startup"
        init = services["minio-init"]
        # must depend on minio to wait for it to be healthy
        depends = init.get("depends_on", {})
        assert "minio" in depends, "minio-init must depend_on minio"
