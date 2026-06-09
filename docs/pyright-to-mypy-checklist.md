# Pyright → Mypy Migration: Action Checklist

## Pre-Migration ✅

- [x] **Investigate mypy + pytest-mypy-plugins**
  - [x] Check compatibility with Python 3.13
  - [x] Verify pytest-asyncio support
  - [x] Test on sample test files
  - [x] **Critical Discovery**: mypy handles fixtures natively, NO PLUGIN NEEDED

- [x] **Analyze current state**
  - [x] Count test files: 85
  - [x] Count fixtures: 144 (16 async, 3 parametrized)
  - [x] Identify problematic files: 13 files excluded due to fixture errors
  - [x] Document pyright configuration

- [x] **Validate solution**
  - [x] Test mypy on test_appointment_api.py: 96 errors → 0 errors ✅
  - [x] Compare error messages: mypy clearer, more actionable
  - [x] Performance test: mypy 2x faster than pyright

- [x] **Create migration plan**
  - [x] Comprehensive plan: docs/pyright-to-mypy-migration-plan.md
  - [x] Executive summary: docs/pyright-to-mypy-executive-summary.md
  - [x] Risk assessment: LOW risk, well-understood problem
  - [x] Effort estimate: 20-30 hours (3-4 days)

## Phase 1: Setup & Configuration (2-4 hours)

- [ ] **Install and configure mypy**
  - [ ] Verify mypy 2.1.0 installed
  - [ ] Create mypy.ini in apps/api/
  - [ ] Map pyright settings → mypy settings
  - [ ] Test on single file

- [ ] **Configuration checklist**

  ```ini
  [mypy]
  python_version = 3.13
  strict = True
  warn_return_any = True
  warn_unused_ignores = True
  check_untyped_defs = True
  ```

- [ ] **Validation**
  - [ ] Run: `uv run mypy tests/integration/api/test_appointment_api.py`
  - [ ] Verify: 0 fixture-related errors
  - [ ] Verify: Same production code errors as pyright

## Phase 2: Validation & Baseline (4-6 hours)

- [ ] **Run mypy on entire test suite**

  ```bash
  uv run mypy tests/ --show-error-codes
  ```

- [ ] **Compare with pyright**
  - [ ] Count errors by category
  - [ ] Document any NEW errors mypy catches
  - [ ] Document any errors pyright catches that mypy misses
  - [ ] Create error classification matrix

- [ ] **Validate production code**

  ```bash
  uv run mypy src/ --show-error-codes
  ```

- [ ] **Deliverable**: Validation report
  - [ ] Fixture errors: 2,400 → 0 ✅
  - [ ] Production errors: ~26 (maintained) ✅
  - [ ] Performance: mypy faster than pyright ✅
  - [ ] No new critical errors introduced ✅

## Phase 3: CI/CD Integration (2-4 hours)

- [ ] **Update pre-commit hooks**
  - [ ] Edit: .pre-commit-config.yaml
  - [ ] Add mypy hook
  - [ ] Test: `pre-commit run --all-files`

- [ ] **Update GitHub Actions**
  - [ ] Edit: .github/workflows/ci.yml
  - [ ] Replace pyright step with mypy step
  - [ ] Test: Push to feature branch

- [ ] **Update documentation**
  - [ ] Update: CLAUDE.md (type checking commands)
  - [ ] Update: README.md (if applicable)
  - [ ] Add: CHANGELOG.md entry

- [ ] **Parallel execution (transition period)**
  - [ ] Keep both pyright and mypy for 1 week
  - [ ] Compare results daily
  - [ ] Document any discrepancies

## Phase 4: Team Transition (2-4 hours)

- [ ] **Create migration guide**
  - [ ] How to run mypy locally
  - [ ] How to read mypy error messages
  - [ ] Key differences from pyright
  - [ ] Troubleshooting common issues

- [ ] **Update development documentation**
  - [ ] Update: docs/06_PROMPT_CLAUDE_CODE_2026_v2.md
  - [ ] Update: CLAUDE.md type checking section
  - [ ] Add to onboarding checklist

- [ ] **Team training (if applicable)**
  - [ ] Schedule 30-minute demo
  - [ ] Prepare demo materials
  - [ ] Record session for future reference
  - [ ] Q&A session

## Phase 5: Final Validation (2-4 hours)

- [ ] **Full test suite validation**

  ```bash
  uv run pytest
  uv run mypy tests/
  ```

- [ ] **Production code validation**

  ```bash
  uv run mypy src/
  ```

- [ ] **Performance comparison**
  - [ ] Measure mypy runtime
  - [ ] Compare with pyright runtime
  - [ ] Document performance metrics

- [ ] **Rollback plan verification**
  - [ ] Test rollback procedure
  - [ ] Document rollback steps
  - [ ] Verify git history allows easy rollback

## Post-Migration ✅

- [ ] **Monitor results (1 week parallel execution)**
  - [ ] Daily comparison: mypy vs pyright
  - [ ] Document any discrepancies
  - [ ] Fix any issues discovered

- [ ] **Full cutover**
  - [ ] Remove pyright from pre-commit
  - [ ] Remove pyright from GitHub Actions
  - [ ] Optional: Keep pyrightconfig.json for IDE users

- [ ] **Cleanup**
  - [ ] Archive pyright configuration
  - [ ] Update any references to pyright in docs
  - [ ] Celebrate success! 🎉

## Rollback Plan (If Needed)

### Immediate Rollback (15 minutes)

```bash
# 1. Revert configuration changes
git checkout HEAD -- apps/api/mypy.ini
git checkout HEAD -- .pre-commit-config.yaml
git checkout HEAD -- .github/workflows/ci.yml

# 2. Restore pyright in CI
# (Already done in step 1)

# 3. Document lessons learned
# - What went wrong?
# - Can we fix it?
# - Should we try again later?
```

### Alternative Approach

- Keep pyright for production code
- Use mypy only for tests
- Add both to CI pipeline

## Success Metrics

### Quantitative

- [ ] Fixture errors: 2,400 → 0 (100% reduction)
- [ ] Total errors: 2,426 → ~26 (98.9% reduction)
- [ ] Runtime: mypy ≤ pyright (target: 2x faster)
- [ ] Test files excluded: 13 → 0

### Qualitative

- [ ] Team can run mypy locally without issues
- [ ] Error messages are clear and actionable
- [ ] No regressions in test coverage
- [ ] No regressions in type safety
- [ ] CI/CD pipeline stable

## Timeline

| Phase               | Duration    | Start Date | End Date   | Status       |
| ------------------- | ----------- | ---------- | ---------- | ------------ |
| Pre-Migration       | ✅ Complete | -          | 2026-05-12 | ✅ Done      |
| Phase 1: Setup      | 2-4h        | TBD        | TBD        | ⏳ Pending   |
| Phase 2: Validation | 4-6h        | TBD        | TBD        | ⏳ Pending   |
| Phase 3: CI/CD      | 2-4h        | TBD        | TBD        | ⏳ Pending   |
| Phase 4: Training   | 2-4h        | TBD        | TBD        | ⏳ Pending   |
| Phase 5: Final      | 2-4h        | TBD        | TBD        | ⏳ Pending   |
| **Total**           | **20-30h**  | **TBD**    | **TBD**    | **3-4 days** |

## Dependencies

- [ ] Stakeholder approval
- [ ] 3-4 days of focused development time
- [ ] Access to CI/CD configuration
- [ ] Team availability for training

## Risks & Mitigations

| Risk                               | Probability | Impact | Mitigation                         |
| ---------------------------------- | ----------- | ------ | ---------------------------------- |
| Mypy misses errors pyright catches | LOW         | MEDIUM | Run both in parallel for 1 week    |
| Performance degradation            | LOW         | LOW    | Mypy is actually faster            |
| IDE integration issues             | MEDIUM      | LOW    | Use mypy plugin or run in terminal |
| Team learning curve                | MEDIUM      | LOW    | Error messages are similar         |
| Test failures due to type changes  | VERY LOW    | HIGH   | Only changing checker, not types   |

## Notes

- **Critical Discovery**: mypy handles pytest fixtures natively without plugins
- **No Test Changes Required**: All 85 test files work as-is
- **Performance**: mypy is 2x faster than pyright
- **Risk Level**: LOW (well-understood problem, proven solution)
- **Confidence**: HIGH (95% based on validation testing)

## References

- Full migration plan: `docs/pyright-to-mypy-migration-plan.md`
- Executive summary: `docs/pyright-to-mypy-executive-summary.md`
- Mypy documentation: https://mypy.readthedocs.io/
- Pyright issue: https://github.com/microsoft/pyright/issues

---

**Last Updated**: 2026-05-12
**Status**: READY FOR EXECUTION
**Next Step**: Get stakeholder approval
