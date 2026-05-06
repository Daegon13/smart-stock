# AGENTS.md — Smart Stock

## Project goal

Smart Stock is being prepared as a public technical showcase.

The immediate goal is NOT to finish real email authentication.
The immediate goal is to make the app stable, presentable, and safe to show publicly.

## Current strategy

Work from:

`docs/patches/SHOWCASE_PATCH_PLAN.md`

Implement the plan in small patches, one branch/PR per patch.

## Hard rules

- Do not implement full email auth unless explicitly requested.
- Do not rewrite the app architecture.
- Do not mix multiple patches in one PR.
- Keep changes minimal and verifiable.
- Preserve a clean path to resume real SaaS auth later.
- Prefer feature flags over deleting unfinished auth code.
- Public showcase mode must not allow dangerous shared-data mutations.

## Verification

Before marking a patch as done, run the available checks from package.json, prioritizing:

- typecheck
- lint
- build
- vercel-build, if present

If a command fails, report the exact error and fix it if it belongs to the current patch.

## Patch completion report

At the end of every patch, summarize:

1. Files changed.
2. What was fixed or implemented.
3. Commands run.
4. Known risks.
5. Next recommended patch.