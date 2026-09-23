# Reverse Engineering Timestamp

- **Performed:** 2026-09-20
- **Repository root:** `./`
- **Source commit:** `80251c9dd122634389fc9158f742729b88b48f78`
- **Scan mode:** full rescan
- **Evidence:** developer scan covers 818 TypeScript/Python implementation files, 258 test files, build/deployment configuration, and catalog image request, upload, storage, and rendering paths.

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: 260920-catalog-image-performanc
fingerprint: 80251c9dd122634389fc9158f742729b88b48f78
analyzed:
  paths:
    - ./
  components:
    - ProductImageSigningEndpoint
    - ImageUploadEndpoint
    - IDOSpacesService
    - ProductImage
    - CatalogPage
    - ProductImageUrlsBatch
    - ProductCard
    - ObjectStorage
    - CDNConfiguration
shallow:
  paths:
    - node_modules/
    - .venv/
    - .git/
    - caches/
    - worktrees/
    - screenshots/
    - historical framework artifacts not on the active execution path
```
