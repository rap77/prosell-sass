"""Language detection use case.

Detects user language from HTTP request with priority:
1. Query parameter (?lang=es)
2. Accept-Language header
3. User DB (if authenticated) - TODO
4. Default: Spanish (es)
"""

from collections.abc import Mapping
from typing import Literal

from fastapi import Request

from prosell.application.dto.i18n import LanguageDetectionResponse


class DetectLanguageUseCase:
    """Use case for detecting user language.

    Priority:
    1. Query parameter (?lang=es or ?lang=en)
    2. Accept-Language header
    3. User DB preference (if authenticated) - Not implemented yet
    4. Default: Spanish (es)

    Example:
        use_case = DetectLanguageUseCase()
        response = await use_case.execute(request)
        print(response.language)  # "es" or "en"
    """

    SUPPORTED_LANGUAGES: Literal["es", "en"] = "es"

    async def execute(self, request: Request) -> LanguageDetectionResponse:
        """Detect user language from request.

        Args:
            request: FastAPI request

        Returns:
            LanguageDetectionResponse with detected language
        """
        # 1. Check query parameter
        lang = request.query_params.get("lang")
        if lang in ("es", "en"):
            return LanguageDetectionResponse(language=lang)

        # 2. Check Accept-Language header
        accept_language = request.headers.get("accept-language", "")
        language = self._parse_accept_language(accept_language)
        if language:
            return LanguageDetectionResponse(language=language)

        # 3. Check user DB (if authenticated) - TODO
        # This would be injected via dependency injection
        # from prosell.application.auth import get_current_user
        # user = await get_current_user(request)
        # if user and user.language:
        #     return LanguageDetectionResponse(language=user.language)

        # 4. Default to Spanish
        return LanguageDetectionResponse(language="es")

    def _parse_accept_language(self, accept_language: str) -> str | None:
        """Parse Accept-Language header.

        Args:
            accept_language: Header value (e.g., "es-ES,es;q=0.9,en;q=0.8")

        Returns:
            Detected language code or None
        """
        if not accept_language:
            return None

        # Parse header (simplified - full parsing includes q-values)
        parts = accept_language.lower().split(",")
        for part in parts:
            lang = part.split(";")[0].strip()
            # Check for exact matches
            if lang in ("es", "en"):
                return lang
            # Check for language prefixes (e.g., "es-ES" -> "es")
            if lang.startswith("es"):
                return "es"
            if lang.startswith("en"):
                return "en"

        return None


__all__ = ["DetectLanguageUseCase"]
