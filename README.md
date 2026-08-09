# cozycubes

[![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/react-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

# About

A colorful, sound-rich Rubik's Cube speedsolving timer — the timing rigor of
csTimer, the keyboard-first minimal feel of monkeytype. No accounts, no servers
holding your data: every solve lives in your own browser.

# Features

- millisecond-precision timer driven by `performance.now()`, hold to ready and
  release to start
- WCA-style inspection mode (off by default) with automatic +2 and DNF
  penalties at the 15s and 17s marks
- scrambles for 2×2 through 7×7 in WCA notation, including wide moves to the
  full legal layer depth
- live Ao5, Ao12, best single, and all-time mean, following WCA trimmed-mean
  and DNF rules
- per-solve +2, DNF, and delete controls that recalculate stats immediately
- stats stored per cube size, so 4×4 times never mix into your 3×3 averages
- persisted locally in IndexedDB — no login, no sync, nothing leaves the device

# Stack

- Next.js (App Router) + TypeScript — one app, UI and any API routes together
- Tailwind CSS + CSS variables for theming
- IndexedDB via `idb` for solve history
- Vitest for the scramble and stats engines, where correctness actually matters

Not yet wired up: there's no CI workflow and no deploy target configured — the
app runs locally only for now.

# Structure

```
app/            # App Router pages — the timer is the home route
components/     # shared UI components
lib/            # scramble-gen, stats-engine, IndexedDB wrapper, timer hook
  *.test.ts     # unit tests, colocated
docs/
  reviews/      # per-milestone review passes
  investigations/
initial_spec.md # original project spec and milestone plan
```

`lib/scramble-gen.ts` and `lib/stats-engine.ts` are kept as pure, dependency-free
modules and tested in isolation — a wrong Ao5 or an illegal scramble is the kind
of bug users notice, so those are the two places tests are non-negotiable.

# Dev

```bash
npm install
npm run dev
```

```bash
npm test        # vitest
npm run lint
npm run build
```

# Bug Report or Feature Request

If you encounter a bug or have a feature request,
[create an issue](https://github.com/bemndy/cozycubes/issues).

# License

MIT — see [LICENSE](LICENSE).
