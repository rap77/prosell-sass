"""Publisher-adapter error classification and secret scrubbing (backend decomposition
Stage 1.4). Pure domain service — zero external dependencies.

Before this extraction, `publish_product_task.py` and `update_listing_task.py` each
re-implemented the same keyword-sniffing rule independently, risking silent drift
between the two. `scrub_secret` closes a real finding: both tasks stringify the FULL
publisher-adapter exception to classify it, then persist that string via
`Publication.mark_failed`. If the adapter ever raises an exception whose message
embeds the decrypted page access token or Playwright session cookie (realistic for an
HTTP/Playwright timeout error echoing request state), that secret would otherwise reach
persisted error storage — violating the explicit rule in `FacebookPage`'s own docstring
("Never log page access tokens in plain text").
"""

from prosell.domain.entities.publication import PublicationErrorCategory

_BLOCKING_KEYWORDS = ("captcha", "checkpoint", "ban")


def classify_publisher_error(exc: Exception) -> PublicationErrorCategory:
    """Classify a publisher-adapter exception as blocking (B) or transient (A)."""
    err_str = str(exc).lower()
    if any(keyword in err_str for keyword in _BLOCKING_KEYWORDS):
        return PublicationErrorCategory.B
    return PublicationErrorCategory.A


def scrub_secret(text: str, secret: str | None) -> str:
    """Redact every occurrence of a known secret value from error text.

    `secret` is the decrypted page access token / session cookie the caller already
    holds in scope — redacting it by exact value (rather than guessing at patterns)
    reliably closes the specific leak this was written for, without hiding unrelated
    error detail an operator would need to diagnose a failed publish.
    """
    if not secret:
        return text
    return text.replace(secret, "[REDACTED]")
