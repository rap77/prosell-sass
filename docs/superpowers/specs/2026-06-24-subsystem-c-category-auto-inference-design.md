# Design: Subsystem C — Category Auto-Inference on Create

**Status:** IMPLEMENTED (PR #48 backend + #49 cross-tenant rename, merged 2026-06-24)

## Scope

Reduces friction in the product create flow by inferring the most likely
category for a new product from signals the seller already entered (title
and attributes), instead of forcing them to navigate a category tree
before they can save anything.

- A new read-side endpoint `POST /api/v1/categories/infer` takes a
  `(title, attributes)` pair and returns ranked candidate categories with
  confidence scores.
- The product create form calls this endpoint as the user types (debounced)
  and pre-selects the top suggestion; the seller can override before saving.
- The existing `POST /products` create flow is **unchanged**: it still
  requires an explicit `category_id`. Inference is a SUGGEST layer, not a
  replacement for explicit choice. (Tradeoffs in §Decisions.)

**Explicitly out of scope** (tracked separately):

- Re-routing the existing `CreateProductUseCase` to make `category_id`
  optional. Reasons in §Decisions.
- ML / embedding-based inference. v1 is a pure rule-based scorer.
- Bulk auto-tagging of legacy products (no `category_id` to backfill — the
  create flow has always required it).
- Cross-tenant inference: only categories the seller can already create
  products in (own tenant's categories + global templates) are candidates.

## Audit findings that shaped this design

Verified against the actual code before designing:

- `CreateProductUseCase.execute()` (`apps/api/src/prosell/application/use_cases/product/create_product.py`) is the single entry point for new products. It receives `category_id` as REQUIRED in `CreateProductRequest` (verified) and immediately calls `category_repository.get_by_id_or_global(...)` to resolve it. Making `category_id` optional here would require a non-trivial refactor of the validation chain (1b `category.validate_attributes` needs a category; 1c VIN stock_number generation needs the category's `attribute_schema`; 2b `resolve_title` needs `category.presentation`). The cost of pushing inference INTO the create flow is much higher than the cost of a separate `infer` endpoint — the latter is a pure read with no transactional surface, no new failure modes, fully reversible. Decision: separate endpoint, not create-flow change.
- `Category.attribute_schema` is a `dict[str, dict[str, object]]` keyed by `field_name`. Each value carries `{type, required, options}`. `Category.validate_attributes(attributes)` is the existing pure validation method and is the right shape-reuse target for the inference scorer (it raises `ValueError` with a precise reason when an attribute doesn't fit — we can use that as a STRUCTURAL MATCH signal: an attribute that fits one category's schema and not another's is strong evidence for that category).
- `Category.field_config` is the UI-renderer side of the same contract (label, type, required). It's loaded in the read API and the form. Useful for keyword/token inference of attribute NAMES vs. category-specific vocabulary.
- `Category.presentation` carries `title_template` and `card_fields`. Not directly useful for inference (it describes display, not semantics), but `card_fields` happens to overlap with likely attribute names and can be a tiebreaker signal.
- `CategoryRepository.get_by_id_or_global(id, tenant_id)` already handles the tenant-or-global lookup. A new `get_active_roots(tenant_id)` is the right companion for "candidate categories" (per §Decisions, restrict to active + root + matching the seller's tenant-or-global).
- No existing inference code anywhere. Greenfield.
- Frontend product create form lives in `apps/web/src/app/(admin)/admin/products/new/page.tsx` (assumed from admin route convention — to be verified in T1). Has a category `<select>` populated from `useCategories()`. Adding a `useInferCategory(title, attributes)` debounced hook + pre-fill is a localized change.
- No spec/plan doc to reference. Creating both new.

## Decisions

### D1 — Separate `/categories/infer` endpoint, not changes to `CreateProductUseCase`

Reasoning: keep the create path stable. Inference is a SUGGESTION, not an
authority; the seller can always override before saving. A separate endpoint:

- Is testable in isolation (pure scorer + thin HTTP wrapper).
- Is reversible — removing it doesn't break the create flow.
- Has no new transactional failure modes.
- Allows the frontend to call it as a hint, not a hard dependency.

The cost is one extra HTTP call (debounced, ~200ms) per keystroke. Acceptable.

### D2 — Restrict candidate set: `is_active=True` AND `parent_id IS NULL` (roots) AND tenant visibility

Reasoning:

- `is_active=False` categories are explicitly hidden from the seller. Suggesting them would be a contradiction.
- Only ROOT categories (verticals) participate in the user's mental model. Sub-categories (e.g. `Vehicles > Cars > SUV`) are refinement choices, not entry points — and a single seller rarely enables more than a handful of roots. The form's existing `<select>` already groups by root, so this matches UX.
- Tenant visibility: same as `get_by_id_or_global` — seller's own categories + global templates (`tenant_id IS NULL`). Same cross-tenant isolation invariant the rest of the system enforces.

Score is computed only over this candidate set. If empty (degenerate org), infer returns `{"suggestion": null, "alternatives": []}` — same shape as a no-match, no special case in the client.

### D3 — Pure rule-based scorer (no ML)

Three independent signals, each scoring 0..1, linearly combined with weights
chosen to make vehicle-style data the obvious winner when its signals are
present without making non-vertical content (a free-text listing with no
attributes) tip into a wrong category:

| Signal                                                       | Weight | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------- |
| **S1 — Title tokens overlap with category vocabulary**       | 0.35   | Tokenize **title** (lowercase, drop stopwords and punctuation, drop tokens < 2 chars). For each category, the vocabulary is `name` + `description` (when non-null) + the union of `field_config[*].field_name`. **Explicitly NOT included**: `presentation.title_template` (raw template syntax like `{year} {make}`), `attribute_schema` keys (overlaps with S2 by design — S2 is the explicit signal, S3 is the value signal). **Explicitly NOT used**: `Product.description` (too long, too free-form, deferred). Score = ` | title_tokens ∩ category_vocab | / max(1,                                                                                                                                                                                                                          | title_tokens | )`, capped at 1. |
| **S2 — Attribute-name overlap with category `field_config`** | 0.40   | For each user-provided attribute key, +1 if a `field_config` entry exists in the category with the same `field_name`. Score = `matches / max(1,                                                                                                                                                                                                                                                                                                                                                                                | provided_attribute_keys       | )`. Strongest signal because it tells us the seller already KNOWS the category's vocabulary (they typed the right field names). If `attribute_schema` is empty, S3 contributes 0 (no constraints to fit) — explicit in the tests. |
| **S3 — Attribute-value schema fit**                          | 0.25   | For each user-provided attribute, build a one-key dict `{key: value}` and call `Category.validate_attributes({key: value})` (catching `ValueError`). +1 per attribute that passes validation for the category (satisfies the category's type, options, required-in-isolation constraints). Score = `fits / max(1,                                                                                                                                                                                                              | provided_attribute_keys       | )`. Catches cases where the seller's attribute names don't match (e.g. they wrote `modelo`instead of`model`) but the VALUES are category-shaped.                                                                                  |

Final score = `0.35·S1 + 0.40·S2 + 0.25·S3` ∈ [0, 1].

Rationale for weights: S2 weighted highest because the seller has to have
typed the right attribute names for a match, which is strong intent. S1 is a
fallback when no attributes are provided (title-only). S3 catches schema
mismatches the user wouldn't notice.

### D3.1 — Scorer returns raw scores; threshold lives in the use case

The scorer returns raw floats in [0, 1] for every candidate. It does NOT
apply the threshold or sort. The use case applies:

- Sort DESC by raw score (over the FULL candidate set, not a cap).
- Find `suggestion`: the highest-scoring candidate above the 0.5 threshold
  (D4). If exactly one candidate is above threshold, it becomes the
  `suggestion`. The cap on `alternatives` is NEVER applied to the
  `suggestion` search — a high-confidence match at rank 7+ must still
  surface as the suggestion. (Initial design had the cap applied before
  the threshold check, which silently hid matches at rank 6+; this is
  fixed.)
- Cap `alternatives` at 5 entries (D6) — display cap, not search cap.
  The suggestion (if any) IS included in alternatives so the form can
  render it in the dropdown with the rest.
- Apply the 0.5 threshold (D4) — module-level constant
  `SINGLE_SUGGESTION_THRESHOLD = 0.5` in `infer_category.py`, not a magic
  number buried in a conditional. Tested directly.
- Rounding to 2 decimals is a DISPLAY concern (D6) — the threshold is
  evaluated against the raw float, not the rounded one. Tested directly.

### D4 — Threshold 0.5 for "single confident suggestion"

- If exactly one category scores >= 0.5 → it's the `suggestion`.
- If 2+ categories score >= 0.5 → return them as `alternatives` (no single
  `suggestion`); the form shows the top 3 as a radio group ("Did you mean
  Vehicles, Real Estate, or something else?"). Tie broken by
  `category.sort_order` (lower first) then `category.id` (stable, deterministic).
- If no category scores >= 0.5 → `suggestion: null`, `alternatives: []`.
  The form falls back to its current behavior (the seller picks manually).

Threshold value 0.5 is a constant, not a config, for v1. The `0.5` value is
chosen so that "only the title contains the category name" alone (S1 = 1.0,
S2 = 0, S3 = 0 → final 0.35) does NOT trigger; you need at least one
attribute name match OR a strong multi-token title overlap. Easy to tune
later via data; the scorer is a pure function over its inputs.

### D5 — Stopword list is a hardcoded constant in the domain service

Tiny Spanish+English set: `{"the","a","an","y","el","la","los","las","de","del","para","con","en","to","of","for","with","by","on"}`. Stored as a module-level tuple in `domain/services/category_inferrer.py` (frozen, no config). Any new stopword requires a code change + test — feature, not config.

### D6 — Response shape: stable, frontend-friendly

```json
{
  "suggestion": { "category_id": "uuid", "name": "Vehicles", "score": 0.87 } | null,
  "alternatives": [
    { "category_id": "uuid", "name": "Vehicles", "score": 0.87 },
    { "category_id": "uuid", "name": "Real Estate", "score": 0.62 }
  ]
}
```

- `suggestion` is non-null only when a single category crossed the threshold (D4).
- `alternatives` is always sorted by score DESC, max 5 entries (capped to keep the response small).
- `score` is the raw `0.35·S1 + 0.40·S2 + 0.25·S3` value, rounded to 2 decimals (display only — the threshold is computed against the raw value, not the rounded one).
- No `confidence` enum (no "low/medium/high"). A 0..1 number is more honest and more honest-to-future-tune.

### D7 — Frontend integration: debounced hook, never auto-submits

- `useInferCategory({ title, attributes }, { enabled })` returns `{ suggestion, alternatives, isLoading }` from a debounced (300ms) call to the endpoint.
- **Default `enabled: false`** (NOT `true` — empty title would still fire a call otherwise). The form opts in explicitly: `useInferCategory({ title, attributes }, { enabled: title.trim().length > 0 })`. A queryKey change (title, attributes) triggers a refetch; the `enabled` flag gates whether any fetch happens at all.
- `staleTime: 30_000` on the React Query — if the seller backspaces-and-retypes the same title within 30s, no extra network call. Aligns with the user-perceived "I'm just fixing a typo" mental model.
- The form's category `<select>` is updated to show the suggestion as the
  first option, visually marked ("Sugerido: Vehicles (87%)") but
  selectable normally. The seller MUST confirm by clicking the option or
  typing into the dropdown — the suggestion is NEVER auto-applied.
- When the seller changes the title or attributes, the hook refetches and
  the dropdown updates. The current selection is preserved if it's still in
  the alternatives list. If the seller CLEARS the title, `enabled` flips to
  false, the suggestion disappears (no stale data in the UI), and the form
  reverts to "select manually".
- Failure: the hook swallows ALL non-2xx responses and network errors
  (returns `suggestion: null`, `isLoading: false`). 4xx (422 bad request,
  401, etc.) and 5xx (server bug) are all treated as "no inference
  available" — the form falls back to the existing manual selection.
  Inference is best-effort, never blocking.
- **Known race condition** (documented, accepted): if the seller types
  fast enough that two debounce windows fire and the slower response
  arrives second, the slower response overwrites the faster one. TanStack
  Query's `queryKey` (title + attributes) does NOT include a sequence
  number, so this is possible. Acceptable for v1 because (a) responses
  are deterministic given the same input — both would yield the same
  result, (b) the suggestion is non-binding so even a wrong-frame
  suggestion is harmless. If a future test shows this confuses users, add
  an `AbortController` in the hook to cancel in-flight requests on input
  change.

## Domain surface

New pure-domain service: `CategoryInferrer` in
`apps/api/src/prosell/domain/services/category_inferrer.py`.

- `class CategoryInferrer` with one method:
  `score(title: str, attributes: dict[str, object], candidates: list[Category]) -> list[tuple[Category, float]]`
- Returns candidates paired with their raw score, sorted DESC. No I/O, no
  external dependencies — fully unit-testable with in-memory `Category` lists.
- All three signals (S1, S2, S3) are private methods so the tests can
  exercise them individually.
- Stopword list is a frozen module-level tuple (D5).

## Application layer

New use case: `InferCategoryUseCase` in
`apps/api/src/prosell/application/use_cases/category/infer_category.py`.

- Module-level constant `SINGLE_SUGGESTION_THRESHOLD = 0.5` (D3.1, D4).
- Loads candidates via `category_repository.get_active_roots(tenant_id)` (new repository method, see D2). If `tenant_id` is `None` (SUPER_ADMIN without an org, rare but possible), the repo returns ONLY global templates (`tenant_id IS NULL`) — no per-tenant candidates. Tested directly.
- Calls `CategoryInferrer.score(...)` on the candidate list — returns raw scores.
- Sorts by raw score DESC, caps at 5.
- Applies the 0.5 threshold: if EXACTLY ONE candidate is above it, becomes the `suggestion`; otherwise `suggestion` is `None`. Ties broken by `category.sort_order` ASC then `category.id` (already sorted in the repo).
- Returns a DTO, not a domain entity, to insulate the API from internal types.
- DTO: `CategoryInferenceResponse` with `suggestion: CategoryInferenceItem | None` + `alternatives: list[CategoryInferenceItem]`. `CategoryInferenceItem = {category_id: UUID, name: str, score: float}`.
- **Does NOT check `organization_vertical` membership.** A seller might be suggested a category they haven't enabled as a vertical for their org — the existing `CreateProductUseCase` enforces vertical membership, so the create flow will reject it. Inference is best-effort: better to suggest and let the create flow reject, than to silently filter and never suggest anything.

## DTOs

`apps/api/src/prosell/application/dto/category/inference.py`:

```python
class CategoryInferenceRequest(BaseModel):
    """Request body for POST /api/v1/categories/infer."""

    title: str = Field(..., min_length=1, max_length=500)  # matches CreateProductRequest
    attributes: dict[str, object] = Field(default_factory=dict)  # matches CreateProductRequest
```

Notes on field defaults:

- `title` is required (we can't infer from an empty title — the scorer returns empty and the form falls back to manual). `min_length=1` rejects whitespace-only after Pydantic-level trimming; the scorer also drops stopwords/tokens < 2 chars internally. `max_length=500` matches `CreateProductRequest` and caps the tokenization cost.
- `attributes` is OPTIONAL with `default_factory=dict` (NOT required), matching the pattern in `CreateProductRequest`. A seller posting `"title": "Honda Civic"` with no attributes body is a normal case.
- Other DTO fields (no `category_id`, no `tenant_id`): the endpoint derives tenant from auth context. The seller can't infer for another tenant.

## Infrastructure layer

- `AbstractCategoryRepository.get_active_roots(tenant_id: UUID | None) -> list[Category]`: new port method. Returns `is_active=True` AND `parent_id IS NULL` AND `(tenant_id == :tenant_id OR tenant_id IS NULL)`.
- New router file: `apps/api/src/prosell/infrastructure/api/routers/category_inference_router.py`. Mounted under `/api/v1/categories` (sibling of the existing `category_router.py`). Single endpoint:
  - `POST /api/v1/categories/infer` body: `{title: str, attributes: dict[str, object]}`.
  - Auth: requires a logged-in user (any role). Sellers (the primary user) MUST be able to call this. No permission gate beyond authentication.
  - Rate limit: `@smart_rate_limit("api")` (5 calls per user per 10s is plenty for debounced typing; the actual limit is configured in the rate-limit middleware, not here).
  - **Logging policy**: log the standard HTTP request line (method, path, status, latency, user_id from auth context). **DO NOT log the request body** — `title` and `attributes` may contain PII or commercially-sensitive product descriptions. The scorer's score + suggestion is also not logged (could leak A/B testing signal). On errors, log the exception class + message but NOT the inputs. Verified at the test level (no `print`/`logger.debug` of body).
- The new repository method implementation: `SqlAlchemyCategoryRepository.get_active_roots(tenant_id)`. SELECT with the three WHERE clauses. Returns sorted by `sort_order` ASC, then `id` ASC (stable).

## Frontend surface

New hook: `apps/web/src/lib/api/useInferCategory.ts` (following the same
pattern as `useCategories`, `useDealers`, etc.):

- Signature: `useInferCategory({ title, attributes }, { enabled = false }): { suggestion, alternatives, isLoading }`. **`enabled` defaults to `false`** (D7) — the form opts in explicitly.
- `enabled` is passed through to `useQuery`'s `enabled` option. When `false`, no fetch is made; the hook returns `suggestion: null, isLoading: false`.
- Internally: `useQuery` with `queryKey: ["infer-category", debouncedTitle, debouncedAttributes]` and `queryFn: () => fetch(...).then(validate).catch(graceful)`. The `title` and `attributes` passed to `queryKey` MUST be the debounced values (via `useDebouncedValue`) — otherwise every keystroke changes the queryKey and the 30s `staleTime` (D7) is bypassed.
- `staleTime: 30_000` (D7) — backspace-then-retype within 30s reuses the cached response.
- On any non-2xx or thrown error, the queryFn returns `{suggestion: null, alternatives: []}` (does NOT throw). The form sees a clean no-op.
- `useDebouncedValue` (~10 lines, no external dep): `useState` + `useEffect` + `setTimeout` + `clearTimeout`. Standard pattern, no library needed — project rule "no new dependency for a few lines".
- **Shared candidate set invariant**: `useInferCategory` and `useCategories` both ultimately return only categories the seller can see (filtered server-side by tenant). The form's `<select>` options and the inference `alternatives` should always overlap, so a suggested id always exists in the dropdown. If they ever diverge (e.g. one cache is stale), the form's existing React-Query-driven re-render will reconcile.

Form integration: `apps/web/src/components/forms/ProductForm.tsx` (the shared product-form component used by both create and edit flows) gets the new hook wired in. The category `<select>` adds the suggestion as the visually-marked first option. No other form fields change.

## Tests

Unit (pure, fast):

- `CategoryInferrer` scorer — at least:
  - Title-only with one obvious match (S1 only) → returns the match below threshold → no `suggestion`.
  - Title + matching attribute names → returns the match above threshold → `suggestion`.
  - Title + matching attribute names + values that pass `validate_attributes` → score higher than the same with names only.
  - Two close competitors → neither becomes the `suggestion`; both in `alternatives`, sorted by score.
  - Empty title + empty attributes → empty result (no crash, no random winner).
  - Stopwords dropped: "el auto rojo" tokenizes to `{"auto", "rojo"}`, not `{"el", "auto", "rojo"}`.

Integration:

- `POST /api/v1/categories/infer` happy path with seeded categories.
- Tenant isolation: a seller's candidates do NOT include another seller's
  tenant-only categories.
- Empty result when seller has no active roots.

Frontend (component):

- `useInferCategory` returns suggestion after debounce.
- The form's category select shows the suggestion, can be overridden.
- Network failure: hook returns no suggestion, form doesn't break.

## Out of scope (deferred)

- Re-running inference when the seller changes the title/attributes AFTER
  they've already manually picked a different category. The current design
  re-runs the hook on every change (cheap), and the manual selection is
  preserved if it survives in `alternatives`. If a future test shows this
  confuses users, we can add a "user has manually overridden" flag to skip
  re-suggesting.
- Multi-tenant candidate ranking (e.g. "this seller operates in Vehicles
  primarily, so break ties in their favor"). Pure local scoring for v1.
- Server-side debouncing or caching of inference results. The frontend
  dedupes within the debounce window via React Query's `staleTime`. If
  scale becomes a concern, add a `functools.lru_cache` on the use case —
  no separate cache service needed (per project rule "no abstraction
  until third use").
- Inferring `parent_id` (sub-category) once a root is chosen. The form's
  existing sub-category dropdown handles that.
- **Product UPDATE form** (edit existing product) getting the inference suggestion. The shared `ProductForm.tsx` is used for both create and edit — wiring the hook in benefits both. v1 wires it in everywhere `ProductForm` is used; if a future UX test shows edit-context inference confuses users, we can scope it back to create-only via the `mode` prop.
- **BulkUploadCSV** getting inference. Each row already has a category column or is matched against `attribute_schema` at parse time; inference is for the single-create form only.
- **i18n for stopwords** beyond Spanish + English. Add a new language set only when there's user demand + a labeled dataset to evaluate against.
- **ML / embedding-based inference.** Layer on top of the same response shape if the rule-based scorer plateaus; not needed for v1.

## Verification

- Backend: `uv run pytest tests/unit/` clean (no new ruff/pyright errors).
  New unit tests for the scorer (≥ 6 cases per the Tests section) +
  integration tests for the endpoint (≥ 3 cases) all pass.
- Frontend: `pnpm vitest run` clean. New component tests for the form's
  suggestion rendering + manual override all pass.
- Manual smoke: log in as a seller, open product create, type
  "Honda Civic 2020" + fill `make`/`model`/`year` attributes → suggestion
  panel shows "Vehicles" with score ≥ 0.6. Type "Departamento 2 ambientes"
  - fill `bedrooms`/`bathrooms` → "Real Estate". Type "Lorem ipsum" with
    no attributes → no suggestion.
