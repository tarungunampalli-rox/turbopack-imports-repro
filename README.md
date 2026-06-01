# Turbopack does not resolve Node.js subpath imports (`package.json` `imports` field)

> Reproduces on `next@canary` (currently `16.3.0-canary.36`) as well as the
> latest stable (`16.2.6`).

## What this repro shows

Next.js 16's Turbopack build (and dev) does not honor the Node.js [subpath
imports](https://nodejs.org/api/packages.html#subpath-imports) field declared
in `package.json` (`"imports": { "#/*": "./src/*" }`).

Every other resolver in the stack (Node, `tsc`/`tsgo`, Vite/Vitest, ESLint with
Node resolver, `oxlint`) honors the `imports` field natively. Turbopack does
not — its [docs](https://nextjs.org/docs/app/api-reference/turbopack#module-resolution)
only list `tsconfig.json` `paths`, `resolveAlias`, and `resolveExtensions` as
supported module-resolution mechanisms.

## Reproduce

```sh
pnpm install
pnpm build
```

Expected output:

```
> Build error occurred
Error: Turbopack build failed with 2 errors:
./src/app
Module not found: Can't resolve '#/greeting'

./src/app/page.tsx:1:1
Module not found: Can't resolve '#/greeting'
```

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

- `package.json` — declares `"imports": { "#/*": "./src/*" }` (Node subpath imports)
- `tsconfig.json` — **does not** declare `compilerOptions.paths`
- `src/greeting.ts` — exports a constant
- `src/app/page.tsx` — imports `from '#/greeting'`

## Environment

- next: `canary` (pinned via `pnpm-lock.yaml`; latest at time of writing was `16.3.0-canary.36`)
- react / react-dom: 19.2.0
- node: tested on v24.15.0
- pnpm: 11.1.0

To bump to the newest canary, run `pnpm update next@canary` and commit the
updated lockfile.

## Ask

Please add support for the `imports` field to Turbopack's resolver, so that
projects standardized on Node subpath imports don't have to maintain a
duplicate `paths` mapping in `tsconfig.json` solely as a Turbopack escape
hatch.
