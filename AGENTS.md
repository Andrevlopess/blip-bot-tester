# Agent Instructions

## Purpose

Unit test builder for chatbot tests.

## Project layout

- Single app at `apps/web/`. **All commands run from there**, not repo root.
- Package manager: **pnpm**.

## Stack

React 19 · Vite 8 · TypeScript 6 · Tailwind CSS 4 · shadcn/ui (radix-nova) · lucide icons · Inter font

## Commands (run from `apps/web/`)

| Command | What it does |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | `tsc -b && vite build` |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier write `**/*.{ts,tsx}` |

**No test runner is configured yet.** There are no test files, no vitest/jest config, and no test script in package.json. You will need to install and configure a test framework before running any tests.

## Path alias

`@/` → `./src/` (configured in both Vite and tsconfig).

## Adding shadcn/ui components

```bash
npx shadcn@latest add <component-name>
```

Components land in `src/components/ui/`.

## Code style

- Prettier: **no semicolons**, double quotes, ES5 trailing commas, LF line endings
- `prettier-plugin-tailwindcss` sorts classes automatically
- TypeScript strict mode with `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`

## Theme system

Built-in `ThemeProvider` (`src/components/theme-provider.tsx`). Press `d` to toggle dark/light. Persists to `localStorage` key `"theme"`.
