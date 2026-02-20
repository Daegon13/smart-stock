# Patch 21 — Fix deploy build error (SupplierWhereInput.storeId)

## What this fixes
Your Vercel build failed with:

> Type error: Object literal may only specify known properties, and 'storeId' does not exist in type 'SupplierWhereInput'.

That happens because in `schema.prisma` your `Supplier` model does **not** have `storeId`, but in:
`app/api/ai/execute/route.ts`
there is a query like:

```ts
prisma.supplier.findFirst({
  where: { storeId, name: { equals: ..., mode: "insensitive" } }
})
```

## What the patch does
It edits that file and changes the filter to **only** use the supplier name:

```ts
where: { name: { ... } }
```

## How to apply
1) Unzip this patch.
2) Copy the folder contents into the root of your repo (so it merges with `/scripts`).
3) Run:

```bash
node scripts/apply-patch-21.mjs
```

4) Commit + push:

```bash
git add app/api/ai/execute/route.ts
git commit -m "fix: remove storeId filter from supplier query"
git push
```

Then re-run the Vercel deploy.
