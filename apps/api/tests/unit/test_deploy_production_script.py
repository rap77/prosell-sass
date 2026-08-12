from pathlib import Path


def test_deploy_script_uses_alembic_available_in_runtime_image() -> None:
    script_path = Path(__file__).parents[4] / "scripts" / "deploy-production.sh"

    assert "uv run alembic" not in script_path.read_text()


def test_deploy_script_checks_ownership_migration_impact() -> None:
    script_path = Path(__file__).parents[4] / "scripts" / "deploy-production.sh"
    script = script_path.read_text()

    assert "20260718_0001" in script
    assert "SELECT count(*) FROM product_ownership" in script
