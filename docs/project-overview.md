# Project Overview

This document gives a repository-level orientation so new contributors can quickly understand what is included and where to start.

## Repository Structure

Current monorepo contents:
- `apps/backend`: primary retail business APIs
- `apps/frontend`: storefront/admin client
- `docs/`: system-level, shared, and navigation documentation

## Key Takeaways
- The backend currently represents the most complete product behavior.
- The frontend evolves alongside backend capabilities and tests.

## Fastest Reading Path
1. `../README.md`
2. `./architecture/backend-architecture.md`
3. `./api/overview.md`
4. Module docs for the domain you are changing

## Documentation Ownership
Keep these in repository `docs/`:
- Architecture and system decisions
- Cross-module API map
- Shared conventions and standards

Keep these in module docs:
- Endpoint-level details
- Module-specific business rules
- Implementation-focused operational notes
