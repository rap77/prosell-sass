# Layer 3: Schema Matching

## Purpose

Detect drift between backend Pydantic DTOs and frontend TypeScript types.

## When to Use

- Endpoints with 10+ response fields
- High risk of type drift
- Manual type synchronization is error-prone

## Implementation

Extracts Pydantic model fields and compares with frontend TypeScript types.

## How It Works

1. **Extract Backend Schema**: Use `schema_extractor.py` to get Pydantic field names and types
2. **Extract Frontend Schema**: Parse TypeScript interfaces/Zod schemas from frontend code
3. **Compare**: Detect missing fields, type mismatches, naming differences

## Example

```python
from skills.contract_testing.schema_extractor import extract_pydantic_fields
from prosell.application.dto.vehicle.create import DecodeVinResponse

backend_fields = extract_pydantic_fields(DecodeVinResponse)
# Returns: {"vin": "string", "vehicle": "VehicleData", ...}
```

## Benefits

- **Early Detection**: Catch type drift before runtime
- **Documentation**: Serves as living documentation of API contracts
- **Refactoring Safety**: Ensure frontend/backend changes stay in sync

## Limitations

- Does not validate nested objects recursively (yet)
- Does not handle union types perfectly
- Frontend schema parsing requires regex (brittle)

## Future Enhancements

- Recursive nested object validation
- Zod schema AST parsing (more robust than regex)
- Auto-generate TypeScript types from Pydantic models
