"""Upload URL DTOs for organization endpoints."""

from typing import Literal

from pydantic import BaseModel


class UploadUrlRequest(BaseModel):
    file_type: Literal["logo", "banner"]
    content_type: str = "image/jpeg"


class UploadUrlResponse(BaseModel):
    upload_url: str
    public_url: str
    key: str
    max_size_bytes: int
