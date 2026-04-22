## Summary

<!-- 1-3 lines -->

## Scope

<!-- tick at least one -->
- [ ] User-visible behavior change (docs MUST be updated)
- [ ] Internal refactor — no API / behavior change
- [ ] Bug fix matching documented behavior
- [ ] Infrastructure / CI / build

## Docs update checklist

The CI job `docs:audit` runs on every push. If it flags blocks:

- [ ] I updated `content/docs/<block>/*.mdx` for every affected block, **OR**
- [ ] I explicitly skipped blocks with `NO_DOC_UPDATE_BLOCKS=<list>` (reason below).

**Skip reason (if any):**

<!-- e.g. "Internal retry-ladder tuning — no user-visible change." -->

## Test plan

- [ ] `pnpm typecheck && pnpm lint && pnpm test`
- [ ] `pnpm docs:audit`
- [ ] `pnpm docs:regen:check`
