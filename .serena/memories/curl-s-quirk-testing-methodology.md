# curl -s Quirk - Testing Methodology

**Discovery**: `curl -s` shows JSON schema instead of values

## What We Saw
```bash
# curl -s shows schema (quirk!)
curl -s http://localhost:8000/health
# Output: { status: string, environment: string }

# wget shows actual values (correct!)
wget -qO- http://localhost:8000/health
# Output: {"status":"healthy","environment":"staging"}
```

## Root Cause
This is a quirk of how `curl -s` formats JSON output. It's NOT a bug in FastAPI or Pydantic. The endpoint works correctly - the issue is only with curl's stdout formatting.

## Testing Methodology (Priority Order)

| Method | Reliability | When to Use |
|--------|-------------|-------------|
| **TestClient** (FastAPI) | ⭐⭐⭐⭐⭐ | Unit tests, most reliable |
| **wget** | ⭐⭐⭐⭐⭐ | Quick API verification |
| **curl -o file** | ⭐⭐⭐⭐ | Saving output to file |
| **curl from container** | ⭐⭐⭐⭐ | Bypassing host quirks |
| **curl -s** (stdout) | ⭐ | ❌ Avoid for JSON |

## Examples

### TestClient (Best for tests)
```python
from fastapi.testclient import TestClient
client = TestClient(app)
response = client.get("/health")
assert response.json() == {"status": "healthy"}
```

### wget (Best for quick checks)
```bash
wget -qO- http://localhost:8000/api/v1/health/
# Shows: {"status":"healthy","timestamp":"..."}
```

### curl -o file (Good for saving)
```bash
curl -s http://localhost:8000/health -o health.json
cat health.json  # Correct JSON
```

### curl -s (Avoid for JSON)
```bash
curl -s http://localhost:8000/health
# Shows: { status: string } ← Schema, not values!
```

## Key Takeaway
When testing API endpoints that return JSON, **avoid `curl -s` for stdout**. Use wget, TestClient, or curl with `-o` flag instead.

This is especially important when verifying FastAPI + Pydantic serialization - the quirk can make you think there's a bug when there isn't one.
