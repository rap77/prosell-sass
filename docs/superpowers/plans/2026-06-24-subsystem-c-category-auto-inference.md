# Plan: Subsystem C — Category Auto-Inference on Create

Implements the design in
`docs/superpowers/specs/2026-06-24-subsystem-c-category-auto-inference-design.md`.
**2 PRs**: backend foundation (T1-T6) → frontend integration (T7-T10). Pure
TDD. No production code without a failing test first.

User decisions (locked):

- **Apply mode**: suggest only, never auto-apply.
- **Heuristic**: triple-signal S1 (0.35) + S2 (0.40) + S3 (0.25), threshold 0.5.
- **PR split**: backend (PR1) → frontend (PR2).

---

## PR 1: Backend foundation

### Task 1: `CategoryInferrer` domain service

**Files:**

- Create: `apps/api/src/prosell/domain/services/category_inferrer.py`
- Create: `apps/api/tests/unit/domain/services/test_category_inferrer.py`

**Public interface:**

```python
class CategoryInferrer:
    def score(
        self,
        title: str,
        attributes: dict[str, object],
        candidates: list[Category],
    ) -> list[tuple[Category, float]]:
        """Returns (category, raw_score) pairs sorted DESC by score. No I/O.
        The threshold check lives in the use case, NOT here -- this method
        just returns raw floats. The caller is responsible for applying
        thresholds, caps, and presentation rounding."""

    # Private — exercised individually by tests
    def _signal_title_overlap(self, title: str, category: Category) -> float: ...
    def _signal_attribute_name_overlap(self, attributes: dict[str, object], category: Category) -> float: ...
    def _signal_value_schema_fit(self, attributes: dict[str, object], category: Category) -> float: ...

# Module-level frozen tuple
STOPWORDS: tuple[str, ...] = (
    "the", "a", "an", "y", "el", "la", "los", "las", "de", "del",
    "para", "con", "en", "to", "of", "for", "with", "by", "on",
)
```

Final score formula: `0.35 * S1 + 0.40 * S2 + 0.25 * S3`. Capped at [0, 1].

- [ ] **Step 1: Write the failing tests**

```python
# apps/api/tests/unit/domain/services/test_category_inferrer.py
from prosell.domain.entities.category import Category
from prosell.domain.services.category_inferrer import CategoryInferrer, STOPWORDS

def _root_category(name: str, *, field_names: list[str] | None = None,
                   required_attrs: dict[str, dict[str, object]] | None = None,
                   description: str | None = None) -> Category:
    return Category(
        id=uuid4(), tenant_id=None, name=name, slug=name.lower(),
        parent_id=None, level=0, is_active=True, description=description,
        field_config=[{"field_name": fn, "field_label": fn, "field_type": "string"}
                     for fn in (field_names or [])],
        attribute_schema=required_attrs or {},
    )

def test_empty_title_and_attributes_returns_empty_list() -> None:
    # Edge case: degenerate input, no crash, no random winner
    inferrer = CategoryInferrer()
    result = inferrer.score("", {}, candidates=[_root_category("Vehicles")])
    assert result == []

def test_stopwords_dropped_from_title_tokens() -> None:
    # "el auto rojo" should tokenize to {"auto", "rojo"}; S1 vs "vehicles" = 0
    vehicles = _root_category("Vehicles", field_names=["model"])
    inferrer = CategoryInferrer()
    score = inferrer.score("el auto rojo", {}, [vehicles])[0][1]
    # S1=0, S2=0, S3=0 (no attrs) → 0
    assert score == pytest.approx(0.0)  # use approx, not ==, for float safety

def test_title_only_no_attribute_match_returns_raw_score_below_threshold() -> None:
    # Single signal alone is below the 0.5 threshold by design -- the
    # threshold check lives in the USE CASE, not the scorer. This test
    # verifies the scorer's raw output, NOT threshold behavior.
    vehicles = _root_category("Vehicles")
    inferrer = CategoryInferrer()
    result = inferrer.score("Vehicles Honda", {}, [vehicles])
    assert len(result) == 1
    # 0.35 * S1 where S1 = min(1.0, 1/2) = 0.5 → 0.175
    assert result[0][1] == pytest.approx(0.35 * 0.5)
    # Explicit: this is BELOW the 0.5 threshold. The use case will not pick
    # this as the single suggestion. Tested at the use case level (T3).

def test_title_plus_matching_attribute_names_returns_raw_score() -> None:
    # Renamed from "crosses_threshold" -- the score is 0.40, BELOW 0.5.
    # Verifies raw scoring only; threshold tested in T3.
    vehicles = _root_category("Vehicles", field_names=["make", "model"])
    inferrer = CategoryInferrer()
    score = inferrer.score(
        "Honda Civic",
        {"make": "Honda", "model": "Civic"},
        [vehicles],
    )[0][1]
    # S1: 0 ("honda civic" ∩ "vehicles" = ∅)
    # S2: 2/2 attribute names match field_config → 1.0
    # S3: 0 schema constraints → 0
    # Final = 0.40
    assert score == pytest.approx(0.40)

def test_value_schema_fit_adds_signal() -> None:
    real_estate = _root_category("Real Estate", required_attrs={
        "bedrooms": {"type": "number", "required": True},
    })
    inferrer = CategoryInferrer()
    score = inferrer.score(
        "Departamento",
        {"bedrooms": 2, "area": 50},  # bedrooms fits, area doesn't
        [real_estate],
    )[0][1]
    # S1: 0
    # S2: 0 (no field_name "bedrooms" in field_config, only in attribute_schema)
    # S3: 1/2 = 0.5
    # Final = 0.25 * 0.5 = 0.125
    assert score == pytest.approx(0.125)

def test_two_competitors_sorted_descending_by_raw_score() -> None:
    vehicles = _root_category("Vehicles", field_names=["make", "model", "year"])
    real_estate = _root_category("Real Estate", field_names=["bedrooms", "area"])
    inferrer = CategoryInferrer()
    result = inferrer.score(
        "Honda Civic 2020",
        {"make": "Honda", "model": "Civic", "year": 2020},
        [real_estate, vehicles],  # deliberately unsorted input
    )
    assert result[0][0].name == "Vehicles"
    assert result[1][0].name == "Real Estate"
    assert result[0][1] > result[1][1]

def test_three_competitors_sort_stable_on_score() -> None:
    # Cap-on-5 is a USE CASE concern (T3), but the scorer's sort must be
    # stable: ties on score break by input order. Verified here.
    a = _root_category("AAA", field_names=["x"])
    b = _root_category("BBB", field_names=["x"])  # identical to a's score
    c = _root_category("CCC", field_names=["x"])
    inferrer = CategoryInferrer()
    # Title + attribute that match ALL three equally
    result = inferrer.score("foo", {"x": 1}, [c, a, b])
    # All three get the same score. Stable sort preserves input order.
    assert [cat.name for cat, _ in result] == ["CCC", "AAA", "BBB"]

def test_empty_attribute_schema_returns_zero_for_s3() -> None:
    # When attribute_schema is empty, validate_attributes short-circuits.
    # Per spec D3, S3 must contribute 0 (no fits to count), not undefined.
    vehicles = _root_category("Vehicles", field_names=["make"])  # empty attribute_schema
    inferrer = CategoryInferrer()
    score = inferrer.score("foo", {"make": "Honda"}, [vehicles])
    # S1: 0
    # S2: 1/1 = 1.0 (make matches field_config)
    # S3: 0 (empty schema → no fits)
    # Final = 0.40
    assert score == pytest.approx(0.40)

def test_category_with_none_description_tokenizes_safely() -> None:
    # D3: vocab is name + description (when non-null) + field_config.
    # None description must not crash tokenization.
    vehicles = _root_category("Vehicles", description=None, field_names=["make"])
    inferrer = CategoryInferrer()
    # Should not raise
    result = inferrer.score("foo bar", {"make": "Honda"}, [vehicles])
    assert len(result) == 1
    # Just check it returns a finite float; exact value isn't the point.
    assert 0.0 <= result[0][1] <= 1.0

def test_non_none_description_contributes_to_s1_vocab() -> None:
    # M2: when description is non-null, its tokens add to the category vocab
    vehicles_no_desc = _root_category("Vehicles", description=None, field_names=[])
    vehicles_with_desc = _root_category("Vehicles", description="cars trucks suv", field_names=[])
    inferrer = CategoryInferrer()
    # Title with "cars" in it
    no_desc_score = inferrer.score("cars", {}, [vehicles_no_desc])[0][1]
    with_desc_score = inferrer.score("cars", {}, [vehicles_with_desc])[0][1]
    assert with_desc_score > no_desc_score  # description contributed

def test_whitespace_only_title_tokenizes_to_empty() -> None:
    # M1: " " or "   " -- Pydantic min_length=1 accepts these. The scorer
    # tokenizer must drop whitespace-only inputs to no tokens, so the
    # result is 0 for all categories. No random winner.
    vehicles = _root_category("Vehicles", field_names=["make"])
    inferrer = CategoryInferrer()
    result = inferrer.score("   ", {"make": "Honda"}, [vehicles])
    # S1: 0 tokens after whitespace strip → 0
    # S2: 1/1 = 1.0 (make matches)
    # S3: 0
    # Final = 0.40 (only S2 fires)
    assert result[0][1] == pytest.approx(0.40)

def test_tiny_title_with_one_char() -> None:
    # Edge: "a" -- 1 char, passes min_length=1, tokenized to "a" (≥ 2 chars filter drops it)
    vehicles = _root_category("Vehicles", field_names=["make"])
    inferrer = CategoryInferrer()
    result = inferrer.score("a", {"make": "Honda"}, [vehicles])
    # S1: "a" filtered (length 1) → 0
    # S2: 1.0
    # S3: 0
    assert result[0][1] == pytest.approx(0.40)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/unit/domain/services/test_category_inferrer.py -v`
Expected: FAIL — `ImportError: No module named 'prosell.domain.services.category_inferrer'`

- [ ] **Step 3: Write the implementation**

Write `category_inferrer.py` with:

- Frozen `STOPWORDS` tuple (literal from above)
- `CategoryInferrer.score()` orchestrator: loop over `candidates`, compute score for each via the three signals, sort DESC (stable sort for ties), return
- Private `_signal_title_overlap`, `_signal_attribute_name_overlap`, `_signal_value_schema_fit`
- Title tokenizer: `re.findall(r"\b\w+\b", title.lower())` minus stopwords minus tokens shorter than 2 chars
- Category vocabulary builder: union of `category.name` tokens + (`category.description` tokens when non-null) + `category.field_config[*].field_name` tokens
- For S3: iterate provided attribute keys, build a one-key dict for each, call `category.validate_attributes({key: value})` (catch `ValueError`, count fits). When `category.attribute_schema` is empty, `validate_attributes` returns without raising — S3 counts ZERO fits for all attributes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/unit/domain/services/test_category_inferrer.py -v`
Expected: all pass.

- [ ] **Step 5: Typecheck + lint**

Run: `cd apps/api && uv run ruff check src/prosell/domain/services/category_inferrer.py tests/unit/domain/services/test_category_inferrer.py && uv run pyright src/prosell/domain/services/category_inferrer.py tests/unit/domain/services/test_category_inferrer.py`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/prosell/domain/services/category_inferrer.py apps/api/tests/unit/domain/services/test_category_inferrer.py
git commit -m "feat(api): CategoryInferrer domain service (T1)"
```

---

### Task 2: `get_active_roots` repository method

**Files:**

- Modify: `apps/api/src/prosell/domain/repositories/category_repository.py` (add port method)
- Modify: `apps/api/src/prosell/infrastructure/repositories/category_repository_impl.py` (add implementation)
- Create: `apps/api/tests/unit/infrastructure/repositories/test_get_active_roots.py` (mocked test)

**Interface:**

```python
# In AbstractCategoryRepository
async def get_active_roots(
    self, tenant_id: UUID | None
) -> list[Category]:
    """Returns is_active=True, parent_id IS NULL, and visible to tenant
    (tenant_id == :tenant_id OR tenant_id IS NULL), sorted by sort_order
    ASC then id ASC."""
```

- [ ] **Step 1: Write the failing test (mocked)**

Use `AsyncMock(spec=AbstractCategoryRepository)` returning a fixed list for the new method. Verify the use case receives exactly the returned list. (Detailed test deferred to T3 — this test just locks the port signature.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/unit/infrastructure/repositories/test_get_active_roots.py -v`
Expected: FAIL — `AttributeError: mock object has no attribute 'get_active_roots'`

- [ ] **Step 3: Add the port method**

Add `get_active_roots` to the abstract repo with a docstring matching the spec.

- [ ] **Step 4: Add the SQLAlchemy implementation**

```python
async def get_active_roots(self, tenant_id: UUID | None) -> list[Category]:
    stmt = (
        select(CategoryModel)
        .where(CategoryModel.is_active.is_(True))
        .where(CategoryModel.parent_id.is_(None))
        .where(
            or_(
                CategoryModel.tenant_id == tenant_id,
                CategoryModel.tenant_id.is_(None),
            )
        )
        .order_by(CategoryModel.sort_order.asc(), CategoryModel.id.asc())
    )
    result = await self.db.execute(stmt)
    return [CategoryModel.to_entity(m) for m in result.scalars().all()]
```

- [ ] **Step 5: Run test to verify it passes**

- [ ] **Step 6: Typecheck + lint + commit**

```bash
git add apps/api/src/prosell/domain/repositories/category_repository.py \
        apps/api/src/prosell/infrastructure/repositories/category_repository_impl.py \
        apps/api/tests/unit/infrastructure/repositories/test_get_active_roots.py
git commit -m "feat(api): get_active_roots repo method (T2)"
```

---

### Task 3: `InferCategoryUseCase` + DTO

**Files:**

- Create: `apps/api/src/prosell/application/dto/category/inference.py` (`CategoryInferenceRequest`, `CategoryInferenceResponse`, `CategoryInferenceItem`)
- Create: `apps/api/src/prosell/application/use_cases/category/infer_category.py`
- Create: `apps/api/tests/unit/application/use_cases/category/test_infer_category.py`

**Key constants** (in `infer_category.py`):

```python
SINGLE_SUGGESTION_THRESHOLD = 0.5
MAX_ALTERNATIVES = 5
SCORE_DISPLAY_DECIMALS = 2
```

The threshold is the same constant tested directly — `pytest.approx(SINGLE_SUGGESTION_THRESHOLD)` is fine; refactoring the threshold value refactors the test in lockstep.

- [ ] **Step 1: Write the failing tests**

```python
# apps/api/tests/unit/application/use_cases/category/test_infer_category.py
from prosell.application.use_cases.category.infer_category import (
    InferCategoryUseCase,
    SINGLE_SUGGESTION_THRESHOLD,
    MAX_ALTERNATIVES,
)


def _candidate(name: str, *, score: float) -> Category:
    return _build_mock_category(name=name, raw_score=score)


async def test_single_suggestion_when_exactly_one_crosses_threshold() -> None:
    # Mock: 2 candidates, only one >= threshold
    # Expected: suggestion == that one; alternatives sorted DESC
    cats = [_candidate("Vehicles", score=0.85), _candidate("Real Estate", score=0.10)]
    ...

async def test_no_suggestion_when_two_competitors_above_threshold() -> None:
    # Mock: 2 candidates both >= threshold
    # Expected: suggestion is None; alternatives has both, sorted DESC
    cats = [_candidate("A", score=0.80), _candidate("B", score=0.70)]
    ...

async def test_no_suggestion_when_none_crosses_threshold() -> None:
    # Mock: all candidates below threshold
    # Expected: suggestion None; alternatives populated (caller can still browse)
    cats = [_candidate("A", score=0.30), _candidate("B", score=0.20)]
    ...

async def test_empty_alternatives_when_no_candidates() -> None:
    # get_active_roots returns []
    # Expected: response == {"suggestion": None, "alternatives": []}

async def test_caps_alternatives_at_max_five_with_single_suggestion() -> None:
    # H1: cap is on alternatives ONLY, not on the candidate set used for
    # finding the suggestion. 8 candidates all above threshold, but the
    # cap must NOT hide the best match.
    cats = [_candidate(f"Cat{i}", score=0.6 + i * 0.01) for i in range(8)]
    # Cat7 has the highest score (0.67) and IS in the top 5 of alternatives
    # anyway. But the test ALSO needs a case where the best is beyond the cap:
    response = await use_case.execute(title="foo", attributes={}, tenant_id=tid)
    assert response.suggestion is not None
    assert response.suggestion.name == "Cat7"  # the global best
    assert len(response.alternatives) == 5
    # The suggestion is also in alternatives (so the form can render it in
    # the dropdown with the rest)
    assert any(a.name == "Cat7" for a in response.alternatives)

async def test_suggestion_finds_global_best_even_beyond_cap() -> None:
    # H1 specific case: the highest-scoring candidate is at rank 7+ in the
    # input order (which becomes the tail after sorting). The cap must not
    # hide it.
    # Construct: 6 candidates with score 0.55 (above threshold), 1 with 0.95
    cats = (
        [_candidate(f"Low{i}", score=0.55) for i in range(6)]
        + [_candidate("HiddenGem", score=0.95)]
    )
    response = await use_case.execute(title="foo", attributes={}, tenant_id=tid)
    # HiddenGem is the global best, above threshold, so it IS the suggestion
    assert response.suggestion is not None
    assert response.suggestion.name == "HiddenGem"
    # alternatives is capped at 5
    assert len(response.alternatives) == 5
    # HiddenGem may or may not be in alternatives (depends on whether the cap
    # was on the candidate set or on the final list -- per spec D3.1 fix,
    # the suggestion IS included in alternatives)

async def test_score_in_response_rounded_to_two_decimals() -> None:
    # 0.87653... → 0.88 in response.score (display value)
    # Threshold is evaluated against the RAW score, not the rounded one
    # -- tested in test_threshold_uses_raw_not_rounded

async def test_threshold_uses_raw_not_rounded_score() -> None:
    # Edge case: raw 0.504 rounds to 0.50; if threshold were evaluated
    # against the rounded value, 0.50 < 0.5 would fail. The threshold
    # must use the raw value, so 0.504 DOES cross.
    cats = [_candidate("Vehicles", score=0.504)]
    response = await use_case.execute(title="foo", attributes={}, tenant_id=tid)
    assert response.suggestion is not None  # 0.504 >= 0.5 raw

async def test_tenant_id_none_returns_only_globals() -> None:
    # SUPER_ADMIN scenario: tenant_id=None, no per-tenant candidates
    # Mock: get_active_roots(None) returns 1 global category
    # Expected: candidates still scored, response has the global
```

- [ ] **Step 2-4: Run fail → write impl → run pass**

- [ ] **Step 5: Typecheck + lint + commit**

```bash
git commit -m "feat(api): InferCategoryUseCase + DTOs (T3)"
```

---

### Task 4: `POST /api/v1/categories/infer` endpoint

**Files:**

- Create: `apps/api/src/prosell/infrastructure/api/routers/category_inference_router.py`
- Create: `apps/api/src/prosell/infrastructure/api/dependencies.py` (add `get_infer_category_use_case` factory)
- Modify: `apps/api/src/prosell/infrastructure/api/main.py` (mount the router)
- Create: `apps/api/tests/integration/api/test_category_inference_router.py`

- [ ] **Step 1: Write the failing tests (integration)**

```python
async def test_infer_returns_suggestion_for_vehicles(
    async_client_as_seller, db_session, seed_root_categories
) -> None:
    response = await async_client_as_seller.post(
        "/api/v1/categories/infer",
        json={"title": "Honda Civic 2020", "attributes": {"make": "Honda", "model": "Civic"}},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["suggestion"]["name"] == "Vehicles"
    assert body["suggestion"]["score"] >= 0.5

async def test_infer_tenant_isolation(
    async_client_as_seller, db_session, other_tenant_root_category
) -> None:
    # Seller's candidates do NOT include another tenant's root category
    response = await async_client_as_seller.post(
        "/api/v1/categories/infer",
        json={"title": "Foo", "attributes": {}},
    )
    other_tenant_names = {c["name"] for c in response.json()["alternatives"]}
    assert other_tenant_root_category.name not in other_tenant_names

async def test_infer_requires_authentication(unauthenticated_client) -> None:
    response = await unauthenticated_client.post(
        "/api/v1/categories/infer", json={"title": "X", "attributes": {}}
    )
    assert response.status_code == 401

async def test_infer_accepts_missing_attributes_field(unauthenticated_client, ...) -> None:
    # M3: request body without `attributes` key at all -- Pydantic default_factory
    # should produce {}. Must not 422.
    response = await unauthenticated_client.post(
        "/api/v1/categories/infer", json={"title": "Honda"}
    )
    assert response.status_code == 200  # 401 if unauthenticated; this test uses a real seller

async def test_infer_accepts_explicit_empty_attributes(unauthenticated_client, ...) -> None:
    # M3: request with `attributes: {}` -- same as missing, must not 422.
    response = await unauthenticated_client.post(
        "/api/v1/categories/infer", json={"title": "Honda", "attributes": {}}
    )
    assert response.status_code == 200

async def test_infer_rejects_whitespace_only_title_with_422(async_client_as_seller) -> None:
    # M1 endpoint-side: Pydantic min_length=1 accepts " " (length 1).
    # Should this 422? The plan says "scorer returns 0 for all", which is
    # graceful. So 200 with no suggestion is acceptable. Document the
    # decision explicitly in the test.
    # (Decision: 200 OK, empty result. Whitespace is filtered by the scorer
    # internally. Rejecting at Pydantic level would be a UX regression --
    # backspace-then-typing would briefly send " " between deletes.)
    response = await async_client_as_seller.post(
        "/api/v1/categories/infer", json={"title": "   ", "attributes": {}}
    )
    assert response.status_code == 200
    assert response.json()["suggestion"] is None
    assert response.json()["alternatives"] == []

async def test_infer_does_not_log_request_body(async_client_as_seller, caplog) -> None:
    # H3: privacy. The endpoint must NOT log title/attributes (could be PII
    # or competitive product description). caplog captures the log; we
    # assert the title does not appear anywhere.
    response = await async_client_as_seller.post(
        "/api/v1/categories/infer",
        json={"title": "SECRET_PRODUCT_NAME_DO_NOT_LOG", "attributes": {}},
    )
    assert response.status_code == 200
    # caplog.records may include uvicorn access logs (which don't include
    # the body) but must NOT include the body content.
    body_leaked = any("SECRET_PRODUCT_NAME_DO_NOT_LOG" in str(r.getMessage()) for r in caplog.records)
    assert not body_leaked, f"Endpoint leaked request body to logs: {[r.getMessage() for r in caplog.records]}"
```

- [ ] **Step 2-4: Run fail → write impl → run pass**

The router:

```python
router = APIRouter(prefix="/categories", tags=["categories"])

@router.post("/infer", response_model=CategoryInferenceResponse)
@smart_rate_limit("api")
async def infer_category(
    request_body: CategoryInferenceRequest,
    current_user: CurrentUser,
    use_case: Annotated[InferCategoryUseCase, Depends(get_infer_category_use_case)],
) -> CategoryInferenceResponse:
    return await use_case.execute(
        title=request_body.title,
        attributes=request_body.attributes,
        tenant_id=current_user.tenant_id,
    )
```

DI factory in `dependencies.py`:

```python
def get_infer_category_use_case(
    category_repository: Annotated[AbstractCategoryRepository, Depends(get_category_repository)],
) -> InferCategoryUseCase:
    return InferCategoryUseCase(category_repository=category_repository)
```

Mount in `main.py`:

```python
app.include_router(category_inference_router.router)
```

- [ ] **Step 5: Typecheck + lint**

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/prosell/infrastructure/api/routers/category_inference_router.py \
        apps/api/src/prosell/infrastructure/api/dependencies.py \
        apps/api/src/prosell/infrastructure/api/main.py \
        apps/api/tests/integration/api/test_category_inference_router.py
git commit -m "feat(api): POST /api/v1/categories/infer endpoint (T4)"
```

---

### Task 5: End-to-end smoke + Final verification (PR 1)

- [ ] **Step 1: Backend full suite**

Run: `cd apps/api && uv run ruff check . && uv run ruff format --check . && uv run pyright && uv run pytest -q`
Expected: all clean, all pass (integration tests skip without DB, expected).

- [ ] **Step 2: Manual smoke (optional, requires docker)**

Per the spec: `curl -X POST http://localhost:8000/api/v1/categories/infer -H "Cookie: access_token=..." -d '{"title": "Honda Civic 2020", "attributes": {"make": "Honda"}}'` → expect `{"suggestion": {"name": "Vehicles", "score": >0.5}, ...}`

- [ ] **Step 3: Push + PR**

Title: `Subsystem C backend: category auto-inference (T1-T4)`
Body: bullet list of tasks, spec link, test counts, "frontend integration coming in PR 2".

---

## PR 2: Frontend integration

### Task 6: `useInferCategory` hook + `useDebouncedValue`

**Files:**

- Create: `apps/web/src/lib/api/schemas/categoryInference.ts` (Zod schema mirroring the backend response — project pattern, see `lib/api/schemas/category.ts` for the categories-list mirror)
- Create: `apps/web/src/lib/hooks/useDebouncedValue.ts`
- Create: `apps/web/src/lib/api/useInferCategory.ts`
- Create: `apps/web/tests/unit/lib/hooks/useDebouncedValue.test.ts`
- Create: `apps/web/tests/unit/lib/api/useInferCategory.test.tsx`

- [ ] **Step 1: Write the failing tests**

`useDebouncedValue`:

```typescript
it("returns the initial value immediately, then updates after the delay", async () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebouncedValue(value, 100),
    {
      initialProps: { value: "a" },
    },
  );
  expect(result.current).toBe("a");
  rerender({ value: "b" });
  expect(result.current).toBe("a"); // not yet
  await waitFor(() => expect(result.current).toBe("b"));
});
```

`useInferCategory`:

```typescript
it("returns suggestion when the endpoint returns one", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestion: { category_id: "c1", name: "Vehicles", score: 0.87 },
        alternatives: [{ category_id: "c1", name: "Vehicles", score: 0.87 }],
      }),
    }),
  );
  const { result } = renderHook(() =>
    useInferCategory({ title: "Honda", attributes: { make: "Honda" } }),
  );
  await waitFor(() => expect(result.current.suggestion?.name).toBe("Vehicles"));
});

it("returns null suggestion and no error on network failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
  const { result } = renderHook(() =>
    useInferCategory({ title: "X", attributes: {} }),
  );
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.suggestion).toBeNull();
});

it("does NOT call fetch when enabled=false (default)", async () => {
  const mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);
  const { result } = renderHook(
    () => useInferCategory({ title: "Honda", attributes: {} }), // enabled defaults to false
  );
  // Wait a tick for any potential effect to fire
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(mockFetch).not.toHaveBeenCalled();
  expect(result.current.suggestion).toBeNull();
});

it("returns null suggestion on non-2xx response (4xx, 5xx)", async () => {
  // Backend bug / validation error must not break the form
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
  );
  const { result } = renderHook(() =>
    useInferCategory({ title: "X", attributes: {} }, { enabled: true }),
  );
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.suggestion).toBeNull();
});

it("debounces: same title within staleTime reuses cached response", async () => {
  // staleTime: 30_000 -- one fetch, two mounts within window, one fetch total
  // (React Query dedupes by queryKey + staleTime)
});
```

- [ ] **Step 2-4: Run fail → write impl → run pass**

Zod schema in `lib/api/schemas/categoryInference.ts`:

```typescript
import { z } from "zod";

export const CategoryInferenceItemSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string(),
  score: z.number().min(0).max(1),
});

export const CategoryInferenceResponseSchema = z.object({
  suggestion: CategoryInferenceItemSchema.nullable(),
  alternatives: z.array(CategoryInferenceItemSchema).max(5),
});

export type CategoryInferenceItem = z.infer<typeof CategoryInferenceItemSchema>;
export type CategoryInferenceResponse = z.infer<
  typeof CategoryInferenceResponseSchema
>;
```

`useDebouncedValue` (~10 lines, no dep):

```typescript
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
```

`useInferCategory` follows the pattern of `useDealers` etc. — TanStack Query `useQuery` with:

- `queryKey: ["infer-category", debouncedTitle, debouncedAttributes]` (debounced values; `useDebouncedValue` with 300ms delay inside the hook)
- `enabled: options.enabled ?? false` (default off; form opts in)
- `staleTime: 30_000` (D7 — backspace-then-retype within 30s reuses cached response)
- `queryFn`: `fetch("/api/v1/categories/infer", { method: "POST", credentials: "include", body: JSON.stringify({ title, attributes }) })`. If `!res.ok`, return `{suggestion: null, alternatives: []}` (DO NOT throw — graceful). If `res.ok`, validate with `CategoryInferenceResponseSchema.parse(await res.json())` and return the typed response. On Zod parse failure, log to console and return the no-suggestion fallback (don't throw into React Query's error state — would mark the hook as errored).

- [ ] **Step 5: Typecheck + lint**

Run: `cd apps/web && pnpm typecheck && pnpm eslint "src/lib/hooks/useDebouncedValue.ts" "src/lib/api/useInferCategory.ts" "tests/unit/lib/hooks/useDebouncedValue.test.ts" "tests/unit/lib/api/useInferCategory.test.tsx"`
Expected: clean.

- [ ] **Step 5b: Prettier**

Run: `cd apps/web && pnpm exec prettier --write "src/lib/hooks/useDebouncedValue.ts" "src/lib/api/useInferCategory.ts" "src/lib/api/schemas/categoryInference.ts" "tests/unit/lib/hooks/useDebouncedValue.test.ts" "tests/unit/lib/api/useInferCategory.test.tsx"`
Expected: clean. Required to unblock pre-push prettier gate (project memory: this gate IS active and blocks push on drift).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/hooks/useDebouncedValue.ts \
        apps/web/src/lib/api/useInferCategory.ts \
        apps/web/src/lib/api/schemas/categoryInference.ts \
        apps/web/tests/unit/lib/hooks/useDebouncedValue.test.ts \
        apps/web/tests/unit/lib/api/useInferCategory.test.tsx
git commit -m "feat(web): useInferCategory hook + useDebouncedValue (T6)"
```

---

### Task 7: Product create form integration

**Files:**

- Modify: `apps/web/src/components/forms/ProductForm.tsx` (the shared form used by both create and edit; the form is in `components/forms/`, not in the page file — verified during T1 audit)
- Modify: `apps/web/src/components/forms/__tests__/ProductForm.edit.test.tsx` (or the appropriate existing test file; new tests can go in a new `ProductForm.infer.test.tsx` if cleaner)

- [ ] **Step 1: Write the failing test**

```typescript
it("pre-selects the suggested category but does not auto-submit", async () => {
  // Mock useInferCategory to return Vehicles with 0.87
  // Mock useCategories to return Vehicles + Real Estate
  // Render the form
  // Verify the category <select> shows "Vehicles" as the first option,
  // visually marked as suggested (e.g. text contains "Sugerido" + score)
  // Verify the form does NOT auto-submit (the submit button is still required)
});

it("allows the seller to override the suggestion", async () => {
  // Mock suggestion = Vehicles
  // User changes the select to Real Estate
  // Submit fires with Real Estate as the category_id
});

it("clearing the title removes the suggestion (no stale data)", async () => {
  // Mock suggestion = Vehicles
  // User types "Honda" → suggestion appears
  // User clears the title field → suggestion disappears from the UI
  // (enabled=false in the hook, no stale "Sugerido" marker)
});

it("suggests on edit too (shared form), not just create", async () => {
  // M4: ProductForm is shared between create and edit. On edit, initialData
  // has a category_id. The hook may suggest a DIFFERENT category based on
  // the title/attributes. Decision: do NOT auto-override the existing
  // category — the suggestion is shown as a "Sugerido" hint, but the
  // initial value wins by default. The seller can manually change it.
  //
  // The form must:
  //  1. Initialize with initialData.category_id (existing behavior).
  //  2. Show the suggestion as a "Sugerido" marker next to the matching
  //     alternative (text: "(Sugerido, 87%)").
  //  3. NOT change the selected value when the suggestion arrives.
  //  4. Update the marker when the title/attributes change.
  //  5. When the user clears the title, remove the marker (handled by
  //     the hook's enabled=false behavior).
  //
  // This UX choice is documented in the spec (M4 / D7) and the test
  // pins it. If a future UX test shows edit-context confusion, the
  // fix is to scope the hook to create-only via the form's `mode` prop.
});
```

- [ ] **Step 2-4: Run fail → wire the hook into the form, render the suggestion as a marked first option → run pass**

The form integration:

- Track the current title and attributes in form state (react-hook-form `watch`)
- Pass them to `useInferCategory({ title, attributes }, { enabled: title.trim().length > 0 })` — debounce is inside the hook
- The category `<select>` is initialized with `initialData?.category_id ?? ""` (existing behavior). On create, this is empty; on edit, it's the product's existing category.
- The hook returns `{suggestion, alternatives, isLoading}`. The form renders the suggestion as a visually-marked marker: if `suggestion.category_id` matches one of the `alternatives`, append "(Sugerido, 87%)" to that option's label. If `suggestion.category_id` is NOT in `alternatives` (unusual; the scorer found a match the category dropdown doesn't have — likely a cache mismatch), still show the marker in a separate row above the dropdown.
- **The selected value is NEVER auto-overrideen by the suggestion.** On create, the seller starts with empty selection; the suggestion's marker just tells them what the system thinks. On edit, the initial value (from `initialData.category_id`) is the default; the suggestion is a hint, not a change.
- The seller MUST click an option (or type) to commit the value — no auto-submit.
- When the seller clears the title: `enabled` flips to false, hook returns `suggestion: null`, the form's category select reverts to the standard list (no "Sugerido" marker).

- [ ] **Step 5: Typecheck + lint**

Run: `cd apps/web && pnpm typecheck && pnpm eslint "src/components/forms/ProductForm.tsx" "src/components/forms/__tests__/ProductForm.edit.test.tsx"` (or whichever test file is used)

- [ ] **Step 5b: Prettier**

Run: `cd apps/web && pnpm exec prettier --write "src/components/forms/ProductForm.tsx" "src/components/forms/__tests__/ProductForm.edit.test.tsx"` (or appropriate files)
Required to unblock pre-push gate.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(web): wire inference suggestion into product create form (T7)"
```

---

### Task 8: End-to-end smoke + Final verification (PR 2)

- [ ] **Step 1: Full frontend suite**

Run: `cd apps/web && pnpm typecheck && pnpm eslint . --max-warnings 0 && pnpm vitest run`
Expected: all clean, all pass.

- [ ] **Step 2: Manual smoke**

1. Log in as a seller
2. Open product create
3. Type "Honda Civic 2020" + fill `make`, `model`, `year` → category dropdown shows "Vehicles (Sugerido, 87%)" first
4. Type "Departamento 2 ambientes" + fill `bedrooms` → shows "Real Estate" suggested
5. Type "Lorem ipsum" with no attrs → no suggestion
6. Click submit with suggestion selected → product created with the suggested category_id

- [ ] **Step 3: Push + PR**

Title: `Subsystem C frontend: wire inference into product create form (T6-T7)`
Body: "Wires the existing PR1 endpoint into the product create form. Suggests, never auto-applies. Closes the Subsystem C roadmap line."

---

## Discovered gaps to address during T1-T7

None anticipated. If something surfaces, follow the same recipe as Subsystem E (G1-G6): write a "### G_X — T_N: <issue>" section here with the proposed fix, bake it into the relevant task.

## Final verification (after T8)

- [ ] Backend: `uv run pytest tests/unit/ -q` — 1138+ pass (1125 baseline + 13 new scorer: 6 from T1 original + 3 added in 1st pass [three-competitor sort, empty-schema S3, None-description safe-tokenize] + 4 added in 2nd pass [non-None description contributes, whitespace-only title, tiny title, M4])
- [ ] Frontend: `pnpm vitest run` — 906+ pass (898 baseline + 2 new useDebouncedValue + 5 new useInferCategory [suggestion, network failure, disabled-default, non-2xx graceful, debounce dedup] + 4 new ProductForm [suggestion render, override, clearing title, edit context])
- [ ] Backend integration: 434+ skipped (no DB), the new 8 inference tests skip too (run in CI): happy path, tenant isolation, auth required, missing attributes, explicit empty attributes, whitespace-only title, body-not-logged, 422 on truly invalid body
- [ ] Lint: ruff 0, pyright 0, eslint 0, typecheck 0
- [ ] Prettier: pre-push gate green (per-step T6 5b and T7 5b)
- [ ] Manual smoke: per T8 step 2
