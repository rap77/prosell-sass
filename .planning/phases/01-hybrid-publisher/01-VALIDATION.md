---
phase: 1
slug: hybrid-publisher
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3.0 + pytest-asyncio 0.24.0 |
| **Config file** | `apps/api/pyproject.toml` (`[tool.pytest.ini_options]`) |
| **Quick run command** | `cd apps/api && uv run pytest tests/unit/ -x --tb=short` |
| **Full suite command** | `cd apps/api && uv run pytest --tb=short` |
| **Estimated runtime** | ~30s quick / ~90s full |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && uv run pytest tests/unit/ -x --tb=short`
- **After every plan wave:** Run `cd apps/api && uv run pytest --tb=short`
- **Before `/gsd:verify-work`:** Full suite must be green (446+ tests)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-W0-01 | 00 | 0 | PUBLISH-07 | unit | `uv run pytest tests/unit/domain/test_publication_entity.py -x` | ❌ W0 | ⬜ pending |
| 1-W0-02 | 00 | 0 | PUBLISH-01,04,05 | unit | `uv run pytest tests/unit/application/publisher/test_publish_use_cases.py -x` | ❌ W0 | ⬜ pending |
| 1-W0-03 | 00 | 0 | PUBLISH-06 | unit | `uv run pytest tests/unit/application/publisher/test_auto_republish.py -x` | ❌ W0 | ⬜ pending |
| 1-W0-04 | 00 | 0 | PUBLISH-03 | unit | `uv run pytest tests/unit/infrastructure/test_publisher_strategy.py -x` | ❌ W0 | ⬜ pending |
| 1-W0-05 | 00 | 0 | PUBLISH-10 | unit | `uv run pytest tests/unit/infrastructure/test_image_pipeline.py -x` | ❌ W0 | ⬜ pending |
| 1-W0-06 | 00 | 0 | PUBLISH-02 | unit | `uv run pytest tests/unit/infrastructure/test_graph_api_publisher.py -x` | ❌ W0 | ⬜ pending |
| 1-01-01 | 01 | 1 | PUBLISH-07 | unit | `uv run pytest tests/unit/domain/test_publication_entity.py -x` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | PUBLISH-01 | unit | `uv run pytest tests/unit/application/publisher/test_publish_use_cases.py -x` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 1 | PUBLISH-10 | unit | `uv run pytest tests/unit/infrastructure/test_image_pipeline.py -x` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 2 | PUBLISH-04,05 | unit | `uv run pytest tests/unit/application/publisher/test_publish_use_cases.py -x` | ❌ W0 | ⬜ pending |
| 1-05-01 | 05 | 2 | PUBLISH-06 | unit | `uv run pytest tests/unit/application/publisher/test_auto_republish.py -x` | ❌ W0 | ⬜ pending |
| 1-06-01 | 06 | 2 | PUBLISH-03 | unit | `uv run pytest tests/unit/infrastructure/test_publisher_strategy.py -x` | ❌ W0 | ⬜ pending |
| 1-07-01 | 07 | 3 | PUBLISH-02 | unit | `uv run pytest tests/unit/infrastructure/test_graph_api_publisher.py -x` | ❌ W0 | ⬜ pending |
| 1-08-01 | 08 | 3 | PUBLISH-09 | unit | `uv run pytest tests/unit/infrastructure/test_rate_limiting.py -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/domain/test_publication_entity.py` — state machine stubs for PUBLISH-07
- [ ] `tests/unit/application/publisher/test_publish_use_cases.py` — use case stubs for PUBLISH-01, 04, 05
- [ ] `tests/unit/application/publisher/test_auto_republish.py` — auto-republish stubs for PUBLISH-06
- [ ] `tests/unit/infrastructure/test_publisher_strategy.py` — strategy selector stubs for PUBLISH-03
- [ ] `tests/unit/infrastructure/test_image_pipeline.py` — image pipeline stubs for PUBLISH-10
- [ ] `tests/unit/infrastructure/test_graph_api_publisher.py` — stub publisher stubs for PUBLISH-02
- [ ] `tests/unit/infrastructure/test_rate_limiting.py` — rate limiting stubs for PUBLISH-09
- [ ] Playwright dep: `uv add playwright && playwright install chromium`
- [ ] Pillow declared: `uv add Pillow` (installed but not in pyproject.toml)
- [ ] `publisher_engine` + `graph_api_approved` settings in `core/config.py`
- [ ] Taskiq broker: validate `ListQueueBroker` for delayed task support

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Playwright publishes vehicle to real FB Marketplace | PUBLISH-01 | Requires live FB account + real browser session; no test FB environment | Log in with real FB account, publish test vehicle, verify listing appears on marketplace.facebook.com within 2 minutes |
| FB listing removed after "sold" action | PUBLISH-05 | Requires real listing on FB Marketplace | Create listing, mark vehicle sold, verify FB listing disappears |
| Auto-republish fires before 7-day expiry | PUBLISH-06 | Requires 7-day wait or time manipulation on live FB | Set publication created_at near expiry, verify scheduler detects and republishes |
| Captcha detection pauses seller queue | Error Cat. B | Requires FB to actually serve captcha | Only verifiable in staging with real FB account under suspicious activity |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
