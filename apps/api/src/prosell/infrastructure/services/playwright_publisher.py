"""Playwright-based Facebook Marketplace publisher.

Anti-detection techniques:
- Standard viewport (1280x900) to match real desktop browser
- Human-like typing (50-150ms per character random delay)
- navigator.webdriver property hidden via init script
- US locale and timezone to match expected FB user
- Each publication gets its own browser context (no cookie contamination)
"""

from __future__ import annotations

import asyncio
import random

from playwright.async_api import Browser, BrowserContext, Page

from prosell.domain.entities.publication import Publication
from prosell.domain.ports.i_publisher_service import IPublisherService


class PlaywrightPublisherService(IPublisherService):
    """Facebook Marketplace publisher using Playwright browser automation.

    Phase 1: Uses session cookies for authentication.
    Real form-filling implementation requires live FB credentials and
    is validated via manual integration testing (see VALIDATION.md).
    """

    FB_MARKETPLACE_VEHICLE_URL = "https://www.facebook.com/marketplace/create/vehicle"
    FB_LOGIN_URL = "https://www.facebook.com/login"

    async def _create_stealth_context(self, browser: Browser) -> BrowserContext:
        """Create a browser context with anti-detection settings."""
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            timezone_id="America/New_York",
        )
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        )
        return context

    async def _human_type(self, page: Page, selector: str, text: str) -> None:
        """Type with human-like delays (50-150ms per keystroke)."""
        await page.click(selector)
        for char in text:
            await page.keyboard.type(char)
            await asyncio.sleep(random.uniform(0.05, 0.15))

    async def _load_cookies(self, context: BrowserContext, cookies_json: str) -> None:
        """Load session cookies from JSON string to avoid re-login."""
        import json

        cookies = json.loads(cookies_json)
        await context.add_cookies(cookies)

    async def publish(
        self,
        publication: Publication,
        access_token: str,
        image_bytes_list: list[bytes],
    ) -> str:
        """Publish vehicle listing to Facebook Marketplace.

        Phase 1: Uses session cookies for authentication (re-login each session).

        Args:
            publication: Publication entity with listing content
            access_token: Facebook session cookies JSON string (Phase 1)
            image_bytes_list: Processed image bytes (compressed, resized, JPG, EXIF-stripped)

        Returns:
            fb_listing_id: Facebook listing ID extracted from redirect URL

        Raises:
            NotImplementedError: Phase 1 implementation requires live FB session cookies.
                Use integration test or manual test with real credentials.
        """
        raise NotImplementedError(
            "PlaywrightPublisherService.publish() — Phase 1 implementation pending. "
            "Requires real FB session cookies. Use integration test or manual test."
        )

    async def update(
        self,
        publication: Publication,
        access_token: str,
        image_bytes_list: list[bytes],
    ) -> None:
        """Update an existing Facebook Marketplace listing.

        Raises:
            NotImplementedError: Phase 1 pending.
        """
        raise NotImplementedError("PlaywrightPublisherService.update() — Phase 1 pending.")

    async def delete(
        self,
        publication: Publication,
        access_token: str,
    ) -> None:
        """Remove a listing from Facebook Marketplace.

        Raises:
            NotImplementedError: Phase 1 pending.
        """
        raise NotImplementedError("PlaywrightPublisherService.delete() — Phase 1 pending.")
