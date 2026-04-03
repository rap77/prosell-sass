# Layer 1: OpenAPI Schema Validator

## Purpose

Fast structure validation for simple CRUD endpoints. Validates that API responses match the declared OpenAPI schema.

## When to Use

- Simple GET/POST endpoints
- No external API integration
- No data normalization
- < 10 response fields

## Implementation

Uses FastAPI's auto-generated OpenAPI schema to validate responses at runtime.

## Template Variables

- `endpoint_path`: API path (e.g., "/api/v1/organizations")
- `endpoint_method`: HTTP method (e.g., "get")
- `response_model`: Pydantic response model class
