from uuid import uuid4

from prosell.core.config import Settings


def test_resend_settings_have_defaults():
    s = Settings()
    assert s.resend_api_key is None
    assert s.resend_from_email == "noreply@prosell.saas"
    assert s.resend_from_name == "ProSell SaaS"


def test_service_organization_id_uses_the_prosell_environment_variable():
    organization_id = uuid4()

    settings = Settings.model_validate({"PROSELL_SERVICE_ORGANIZATION_ID": str(organization_id)})

    assert settings.service_organization_id == organization_id
