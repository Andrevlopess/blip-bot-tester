# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Unit test builder for chatbots: create tests made of steps, each step sends an input message and defines one or more expected output messages.

## Project layout

- Single app at `apps/web/`. **All commands run from there**, not the repo root.
- Package manager: **pnpm**.

## Stack

React 19 · Vite 8 · TypeScript 6 · Tailwind CSS 4 · shadcn/ui (`radix-nova` style) · lucide-react icons · Inter font · react-router 8 · dnd-kit (step reordering)

## Commands (run from `apps/web/`)

| Command | What it does |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | `tsc -b && vite build` |
| `pnpm preview` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier write `**/*.{ts,tsx}` |

**No test runner is configured yet.** There are no test files, no vitest/jest config, and no test script in `package.json`. You will need to install and configure a test framework before running any tests.

## Path alias

`@/` → `./src/` (configured in both `vite.config.ts` and `tsconfig.json`).

## Architecture

- **Data model** (`src/types/test.ts`): a `UnitTest` has `id`, `name`, `createdAt`, `steps: Step[]`, and optional per-test overrides `timeoutMs`/`similarityThreshold`. A `Step` has `id`, `name`, `input: InputMessage` (sent to the chatbot), `expectedOutput: ExpectedMessage[]` (one or more expected reply messages), and the same two optional overrides. Messages are **typed objects, not bare strings**: `ExpectedMessage` is a union of `text`/`quickReply`/`menu`/`cta` (`quickReply`/`menu` carry `options: MessageOption[]`; `cta` carries `buttonText`/`url`), each additionally allowing its own `similarityThreshold`/`timeoutMs`. `InputMessage` is `TextMessage` only, but stays a typed message so the same type-select UI works on both sides. **Override resolution, least to most specific: global settings < test < step < message.**
- **Message formatting** (`src/lib/message-format.ts`): `emptyInputMessage()`/`emptyExpectedMessage(type)` build blank messages; `formatExpectedMessage()` renders an `ExpectedMessage` as the same JSON payload shape the real bot sends for that type (plain string for `text`), so scoring compares like with like. `src/components/test-builder/message-preview.tsx` renders either side of that comparison as chat bubbles and parses **generically** off `interactive.type`/option arrays — it must keep handling real bot payloads, not just the shapes `formatExpectedMessage` produces.
- **Test state** lives in React state, optionally synced to a remote Blip Bucket document. `src/store/tests.tsx` (`TestsProvider`) holds a `useState<UnitTest[]>` seeded with mock data, loads/saves it as one JSON document via `bucketClient` (from `useSettings()`) when a Bucket connection is configured, debounced 800ms, and exposes CRUD actions (`addTest`, `updateTest`, `deleteTest`, `getTest`, `addStep`, `updateStep`, `deleteStep`, `reorderSteps`). `src/store/tests-context.tsx` defines the `TestsContext`/`useTests()` hook. `syncStatus` (`"local-only"|"loading"|"syncing"|"synced"|"error"`) surfaces sync state via `src/components/sync-status-badge.tsx`.
- **Bucket storage** (`src/lib/blip-bucket-client.ts`): `createBlipBucketClient(config)` talks to `https://<shortName>.http.msging.net/commands` with `get`/`set`/`delete` on `/buckets/<documentId>`. Bucket documents must be JSON **objects**, so values are wrapped as `{ data: value }` on write and unwrapped on read. Failures throw `BlipBucketError` with `kind: "network"|"auth"|"unknown"` (network errors are usually CORS, since this is called straight from the browser).
- **Settings** (`src/types/settings.ts`, `src/store/settings.tsx`/`settings-context.tsx`): `AppSettings` (persisted to `localStorage` key `"blip-tester-settings"`) holds `bucket` (`BlipBucketConfig`: `shortName`/`authorizationKey`/`documentId`, for the Bucket sync above), `debugConnection` (`DebugConnectionConfig`: `tenant`/`botIdentifier`, for running tests — see below), and run defaults (`defaultTimeoutMs`, `defaultSimilarityThreshold`). Edited on `src/pages/settings.tsx` (`/settings`).
- **Routing** (`src/App.tsx`): `react-router` `BrowserRouter` with routes under a shared `Layout` — `/` (`HomePage`, list of tests), `/tests/:id` (`TestDetailPage`, edit a test's steps), and `/settings` (`SettingsPage`).
- **Provider order** (`src/main.tsx`): `ThemeProvider` → `SettingsProvider` → `TestsProvider` → `RunProvider` → `App`. `TestsProvider` and `RunProvider` both depend on `useSettings()`, so `SettingsProvider` must stay outermost of the three.
- **Layout** (`src/components/layout.tsx`): sidebar (`AppSidebar`) + header + `<Outlet />` content area, built on the shadcn `Sidebar` primitives.
- **Pages** (`src/pages/`) own data fetching from `useTests()`/`useRun()`/`useSettings()` and pass callbacks down; presentational pieces live in `src/components/test-builder/` (`TestListItem`, `StepItem`, `MessageTypeSelect`, `ExpectedMessageFields`, `MessageOptionsEditor`, `MessagePreview`) and `src/components/test-runner/` (`RunStatusBadge`, `ScoreBar`), otherwise dumb components driven by props. `HomePage` runs a checkbox-selected subset of tests at once; `TestDetailPage` runs the single open test, and wraps its steps in dnd-kit `DndContext`/`SortableContext` (with `StepItem` calling `useSortable`) to reorder them through `reorderSteps`. Threshold/timeout overrides are edited in `StepItem`'s two settings dialogs (step-level and per-expected-message), where a checkbox toggling `undefined` ↔ a concrete value is what distinguishes "inherited" from "overridden".
- **Running tests against a real bot** (`src/lib/blip-debug-client.ts`, `src/lib/test-runner.ts`, `src/store/run.tsx`/`run-context.tsx`): executes a `UnitTest` against a live chatbot over the Lime-protocol-over-WebSocket debug channel, entirely from the browser (no backend, no Blip login, no bot secret key). `createBlipDebugClient().connect({ tenant, botIdentifier })` opens `wss://<tenant>.ws.0mn.io:443` with the `lime` subprotocol and runs two phases: a throwaway *guest* session that creates a fresh visitor account (fresh per test run, intentionally not persisted, so every run starts the bot conversation from scratch), then an authenticated session that sets `/presence` (must be acked before anything else is sent) and `/receipt`, auto-replies to server pings, and exchanges `text/plain` messages with `<botIdentifier>@msging.net`. `onMessage` only fires for genuine bot replies — own-message echoes, `#message.echo` metadata, chatstate (typing) messages, delivery notifications and anything not from `<botIdentifier>@` are filtered out; non-string content is surfaced as `content.text` when present, else `JSON.stringify(content)`. `src/lib/test-runner.ts` (`runTest`/`runManyTests`) drives one client per test (so concurrent runs stay in isolated conversations), sends each step's `input`, and collects replies. Timing details that are deliberate, not incidental: **each expected message gets its own wait window** measured from when the previous message arrived (not one deadline per step); after the expected count arrives the runner waits `EXTRA_MESSAGE_GRACE_MS` (5s) and **fails the step if the bot keeps talking** (extra replies are appended to `messages` as zero-score entries); and every step runs even after a failure so the whole conversation's results are visible. Step status is `passed`, `timeout` (fewer replies than expected) or `failed`. Scoring lives in `src/lib/similarity.ts` (`scoreStep`: `formatExpectedMessage` on the expected side, then an even 50/50 blend of normalized Levenshtein and token-set Jaccard, each message checked against its own resolved threshold). `src/store/run.tsx` (`RunProvider`/`useRun()`) tracks `runs: Record<testId, TestRunResult>` (`src/types/run.ts`), requires `settings.debugConnection` to be configured (surfaces an `"error"` status per test otherwise), and exposes `startRun(tests)`/`cancelRun(testId)`/`clearRun(testId)`. `src/types/lime.ts` documents the confirmed Lime envelope shapes (session/command/message/notification).
- **UI primitives** (`src/components/ui/`) are shadcn/ui components (radix-nova style, `baseColor: neutral`). Add new ones with `npx shadcn@latest add <component-name>` — they land in `src/components/ui/`; do not hand-write basic primitives.
- **Theming** (`src/components/theme-provider.tsx`): custom `ThemeProvider`/`useTheme`, supports `light`/`dark`/`system`, persists to `localStorage` key `"theme"`, syncs across tabs via the `storage` event, and toggles light/dark by pressing `d` (ignored while an editable element is focused or a modifier key is held).

## Docs

- `README.md` (repo root) is the human-facing doc: features, setup, Settings fields, and how a run works. Keep it in sync when run semantics, settings, or message types change.
- `AGENTS.md` mirrors a subset of this file for other agents.
- `apps/web/README.md` is still the unmodified Vite/shadcn template boilerplate.

## Code style

- Prettier: no semicolons, double quotes, ES5 trailing commas, LF line endings, 80-char print width.
- `prettier-plugin-tailwindcss` auto-sorts classes; `cn`/`cva` calls are recognized for sorting.
- TypeScript strict mode with `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`.
- ESLint flat config: `@eslint/js` recommended + `typescript-eslint` recommended + `react-hooks` recommended + `react-refresh` (Vite).
