from prosell.core.config import Settings


def test_resend_settings_have_defaults():
    s = Settings()
    assert s.resend_api_key is None
    assert s.resend_from_email == "noreply@prosell.saas"
    assert s.resend_from_name == "ProSell SaaS"
