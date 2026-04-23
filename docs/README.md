# Documentation Guide

The `docs/` directory contains only repository-level and cross-cutting documentation.

Detailed module documentation is colocated with module source code under:
`apps/backend/src/modules/*/docs/`

This structure keeps ownership clear:
- Shared/system architecture docs at repository root
- Business/API implementation details near the owning module

## Recommended Reading Order (Backend Focus)
1. `../README.md`
2. `./project-overview.md`
3. `./architecture/backend-architecture.md`
4. `./api/overview.md`
5. Module docs under `apps/backend/src/modules/*/docs/`

## What Belongs in `docs/`
- Project overview
- Backend architecture
- Cross-module API navigation
- Shared conventions

## What Does Not Belong Here
- Detailed module API guides
- Module-specific storage/indexing notes
- Business rules owned by a single module
