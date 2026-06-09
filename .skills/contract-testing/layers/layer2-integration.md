# Layer 2: Integration + Contract Validation

## Purpose

Full format validation for endpoints with external APIs or data normalization. Validates both Pydantic structure AND business rules (field formats, value normalization).

## When to Use

- External API integration (NHTSA, Facebook, Google)
- Data normalization layer (NHTSA → Facebook Marketplace values)
- Business-critical endpoints (auth, payment)
- Complex business rules (> 10 fields)

## Implementation

Combines:

1. **Pydantic validation** - Structure validation (via `model_validate`)
2. **Contract validation** - Format checks (lowercase, UPPERCASE, specific values)
3. **Multiple test cases** - Different scenarios (valid VIN, invalid VIN, edge cases)

## Template Variables

- `endpoint_path`: API path (e.g., "/api/v1/vehicles/decode")
- `endpoint_method`: HTTP method (e.g., "post")
- `dto_module`: Python module path (e.g., "prosell.application.dto.vehicle")
- `response_dto_name`: Pydantic response model class (e.g., "DecodeVinResponse")
- `contract_fields`: List of field validations (format, case, allowed values)
- `test_cases`: List of test scenarios (input, expected output)

## Example Contract Fields

```python
contract_fields = [
    {
        "field": "make",
        "format": "lowercase",
        "description": "Make must be lowercase (e.g., 'chevrolet', 'buick')"
    },
    {
        "field": "drivetrain",
        "format": "uppercase",
        "description": "Drivetrain must be UPPERCASE (e.g., 'FWD', 'AWD')"
    },
    {
        "field": "body_type",
        "format": "lowercase",
        "description": "Body type must be lowercase (e.g., 'suv', 'sedan')"
    }
]
```

## Difference from Layer 1

| Layer 1 (OpenAPI)     | Layer 2 (Integration)        |
| --------------------- | ---------------------------- |
| Structure only        | Structure + Business Rules   |
| Auto-generated schema | Manual contract validation   |
| Fast validation       | Slower, comprehensive        |
| Simple CRUD           | External APIs, normalization |
