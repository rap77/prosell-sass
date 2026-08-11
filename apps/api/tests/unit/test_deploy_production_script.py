from pathlib import Path


def test_deploy_script_uses_alembic_available_in_runtime_image() -> None:
    script_path = Path(__file__).parents[4] / "scripts" / "deploy-production.sh"

    assert "uv run alembic" not in script_path.read_text()
