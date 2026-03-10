# Frontend Production Audit

## Executive Summary

The current `apps/web` frontend is not production-ready for a multi-tenant SaaS.

The main issue is not visual quality alone. The main issue is architectural: backend integration, route loading, client hydration, and presentation logic are mixed together without a stable contract boundary.

Under real data, this creates three failure modes:

1. Server-rendered page loads fail and return full-page `500` errors.
2. Pages render once and then blank out during hydration because components assume mock-era data shapes.
3. Some onboarding and analytics flows block too much work before rendering, making the UI appear frozen even when the backend is functioning.

## Root Problems

### 1. Separation of Concerns Is Weak

The current frontend mixes:

- route data orchestration
- API transport concerns
- response parsing
- normalization
- view-model shaping
- presentation logic
- client-side mutation behavior

This makes every page responsible for too many layers at once.

### 2. No Stable Route-Level Data Contract

Pages and components often consume backend payloads too directly.

As a result:

- arrays are assumed where objects may be returned
- numeric fields are assumed where values may be missing
- percentages and derived fields are expected even when the backend does not guarantee them

This is the main cause of hydration crashes such as:

- `.find is not a function`
- `Cannot read properties of undefined (reading 'toFixed')`

### 3. SSR and Client Loading Patterns Are Inconsistent

The app currently mixes:

- `+layout.ts`
- `+page.ts`
- `+page.server.ts`
- client-side post-load invalidation
- direct `fetch`
- shared API client calls

For a production SvelteKit app, this is too inconsistent. Route behavior differs depending on where the code runs.

### 4. UI Components Are Not Render-Safe Under Partial Data

Many components still assume that data is complete and already normalized.

That is acceptable in a mock/demo phase but not in a production SaaS where:

- accounts may have zero resources
- features may be partially available
- analytics fields may be absent
- backend contracts may evolve
- slow or partial responses must still render safely

### 5. Some Heavy Work Happens Before First Render

The onboarding zone selection route currently triggers resource sync as part of the rendering path.

Even when this does not crash, it creates white-screen behavior and makes the frontend feel broken.

## Production Risk Areas

### Auth and Onboarding

- register/login UI quality is below the rest of the product
- auth submissions need explicit loading states
- onboarding should be full-screen, not embedded in the app shell
- registration flow is still inconsistent with confirmation-first expectations

### Dashboard and Analytics

- these are currently the clearest examples of hydration failure under live data
- they need a normalized server-owned view model before any further UI iteration

### Management Pages

- settings, inventory, billing, integrations, rules, mitigations, team, developer, and audit all need consistent server-load architecture
- pages should not rely on transport helpers that behave differently across server/client contexts

### Multi-Tenant Safety

This app will be used by different teams and different Cloudflare accounts.

That means the frontend must treat all backend data as potentially:

- sparse
- delayed
- partially unavailable
- feature-dependent
- empty on first login

The current UI architecture does not enforce that discipline.

## Required Direction

The frontend should move to:

1. server-owned route loading
2. route-level normalization/view-model builders
3. presentation components that only consume stable data
4. client-side actions only for mutation/interactivity
5. route-safe empty/loading/error states

## Decision

Do not continue page-by-page patching from runtime stack traces.

Treat the frontend as needing an integration architecture correction before more feature work proceeds.
