# Patch 22 — Fix Vercel build: `Property 'type' does not exist on type 'never'`

## Symptom
Build fails with:

```
./app/api/ai/execute/route.ts:264:32
Type error: Property 'type' does not exist on type 'never'.
```

## Why it happens
TypeScript can narrow `a` to `never` in an "unsupported action" branch when your action union becomes exhaustive.
So referencing `a.type` in that branch becomes invalid.

## Fix
We capture a safe string at the start of the loop:
- `actionType = (a as any).type ?? "unknown"`

Then we use `actionType` when pushing results for unsupported actions / errors.

## Apply
1) Unzip this patch into the repo root
2) Run:

```bash
node scripts/apply-patch-22.mjs
```

3) Commit + push
