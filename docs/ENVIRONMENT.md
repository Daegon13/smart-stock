# Smart Stock environment modes

Smart Stock centralizes auth, demo, and showcase policy in `lib/runtimeFlags.ts`.

## Default SaaS / private beta mode

If no showcase variables are set, the app defaults to the safer SaaS path:

```env
AUTH_LOGIN_ENABLED=true
SHOWCASE_MODE=false
NEXT_PUBLIC_SHOWCASE_MODE=false
SHOWCASE_READONLY=false
NEXT_PUBLIC_SHOWCASE_READONLY=false
```

In this mode, login/beta-gate protection remains enabled and production is not opened by accident.

## Public showcase read-only mode

Use this for a public portfolio demo backed by stable sample data:

```env
SHOWCASE_MODE=true
NEXT_PUBLIC_SHOWCASE_MODE=true
SHOWCASE_READONLY=true
NEXT_PUBLIC_SHOWCASE_READONLY=true
AUTH_LOGIN_ENABLED=false
DEMO_STORE_ID=<stable demo store id>
ALLOW_DEMO_NO_AUTH=false
ALLOW_DEMO_SEED=false
```

`SHOWCASE_MODE` is the server-side switch that can bypass login. `NEXT_PUBLIC_SHOWCASE_MODE` is only for client-visible showcase UI. `SHOWCASE_READONLY` defaults to `true` whenever `SHOWCASE_MODE=true`, unless explicitly set to `false` for a controlled private demo. `NEXT_PUBLIC_SHOWCASE_READONLY` mirrors that state for client copy only; server-side blocking still depends on `SHOWCASE_READONLY`.

## Private writable demo mode

Use only in trusted environments:

```env
SHOWCASE_MODE=true
NEXT_PUBLIC_SHOWCASE_MODE=true
SHOWCASE_READONLY=false
NEXT_PUBLIC_SHOWCASE_READONLY=false
AUTH_LOGIN_ENABLED=false
DEMO_STORE_ID=<stable demo store id>
```

## Legacy compatibility

- `ALLOW_DEMO_NO_AUTH=true` still allows no-auth demo access only outside production.
- `ALLOW_DEMO_SEED=true` remains the explicit production override for demo seed endpoints.
- `BETA_PASSWORD` and `BETA_SECRET` still configure the beta gate when showcase mode is off.
- `DEMO_STORE_ID`/`SHOWCASE_STORE_ID` is only preferred while login bypass/showcase mode is active; SaaS sessions keep using the active store cookie.
