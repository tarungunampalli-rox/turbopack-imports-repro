# Turbopack does not resolve Node.js subpath imports whose key starts with `#/`

> Reproduces on `next@canary` (`16.3.0-canary.36`) and the latest stable (`16.2.6`).
>
> [vercel/next.js#93308](https://github.com/vercel/next.js/pull/93308) (merged
> 2026-05-20) fixed `imports` entries pointing to **external packages** — that
> case works in canary. The remaining bug is narrower than originally reported:
> Turbopack rejects any alias **whose key starts with literal `#/`** (i.e. has
> an empty name part), regardless of the target. Aliases with a non-empty name
> like `#src/*` resolve correctly.

## What this repro shows

`src/app/page.tsx` exercises three subpath imports:

```ts
import { capitalize } from '#lodash'              // #lodash → "lodash"   (external, works)
import { greeting } from '#src/greeting'           // #src/*  → "./src/*"  (named local, works)
import { greeting } from '#/greeting'              // #/*     → "./src/*"  (bare-slash local, FAILS)
```

`pnpm build` fails only on the third line:

```
Error: Turbopack build failed with 2 errors:
./src/app/page.tsx:3:1
Module not found: Can't resolve '#/greeting'
> 3 | import { greeting as fromSlashAlias } from '#/greeting'
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

Likely cause: Turbopack's resolver treats `#` as a URL fragment delimiter, so
`#/...` parses as a fragment-only URI with no name component, and the resolver
gives up. Aliases like `#src/...` start with a real identifier and resolve
through the normal subpath-imports path.

## Workarounds

Two options, in order of preference:

1. **Rename the alias** from `#/*` to a non-empty-name form like `#src/*`. This
   needs no `tsconfig.json` change — Turbopack, Node, and `tsc` all resolve
   `#src/*` correctly via the `imports` field alone.

2. **Mirror the alias** in `tsconfig.json` `compilerOptions.paths` if you must
   keep the `#/*` key:

   ```json
   { "compilerOptions": { "paths": { "#/*": ["./src/*"] } } }
   ```

   This re-routes resolution through Turbopack's `paths` support and bypasses
   the buggy `#/` codepath.

## Workaround

Mirror the `imports` field in `tsconfig.json` `compilerOptions.paths`:

```json
{
  "compilerOptions": {
    "paths": {
      "#/*": ["./src/*"]
    }
  }
}
```

After adding that, `pnpm build` succeeds. This double-declaration is the only
way to make Turbopack resolve the same specifiers that every other tool in
the project already resolves correctly via the `imports` field.

## Project structure

- `package.json` — declares three `imports` entries: `#/*`, `#src/*`, `#lodash`
- `tsconfig.json` — **does not** declare `compilerOptions.paths`
- `src/greeting.ts` — exports a constant
- `src/app/page.tsx` — exercises all three aliases; only `#/...` fails

## Environment

- next: `canary` (pinned via `pnpm-lock.yaml`; latest at time of writing was `16.3.0-canary.36`)
- react / react-dom: 19.2.0
- node: tested on v24.15.0
- pnpm: 11.1.0

To bump to the newest canary, run `pnpm update next@canary` and commit the
updated lockfile.

## Ask

Please make Turbopack accept `imports` keys with empty name components
(`#/*`, `#/foo`, …), so that projects following the popular `"#/*": "./src/*"`
convention don't have to rename the alias or duplicate it in
`tsconfig.json` `paths`.
