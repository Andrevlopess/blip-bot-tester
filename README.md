# blip-bot-tester

A unit test builder for Blip chatbots. You write tests as a sequence of steps —
each step sends one message to the bot and declares the reply (or replies) you
expect — then run them against a live bot and see, per message, how close the
real answer was to the expected one.

Everything runs in the browser: no backend, no Blip login, and no bot secret
key. Runs open a throwaway guest visitor session against the bot over the same
public Lime-over-WebSocket channel the Blip chat widget uses.

## Features

- **Tests made of steps** — a step is `input` (a text message sent to the bot)
  plus `expectedOutput` (one or more messages you expect back, in order).
- **Typed expected messages** — `text`, `quickReply`, `menu` and `cta`. Each
  type is authored with its own fields and previewed as a chat bubble; scoring
  compares against the same JSON payload shape the real bot sends.
- **Variable assertions** — each expected output has a **Message** / **Variable**
  tab. On the Variable tab it stops expecting a bot reply and instead asserts on
  the tester's bot-side context variables: a list of `name` + condition + value
  checks (`equals`, `different`, `contains`, `not contains`, `exists`,
  `not exists`), read back once the step's messages settle.
- **Layered thresholds and timeouts** — set defaults globally, then override per
  test, per step, or per individual expected message (most specific wins).
- **Tester variables** — per test, on the **Variables** tab: contact fields
  (name, phone number, tax document, custom `extras`) and bot-side context
  variables, both applied to the tester visitor before the first step runs.
- **Live runs** — run one test from its detail page, or select several on the
  home page and run them concurrently, each in its own isolated conversation.
- **Similarity scoring** — replies are scored 0–1 against the expected text and
  compared to the threshold, with a per-message score bar and the actual reply
  shown side by side with the expected one.
- **Drag-and-drop step reordering**, inline renaming, and collapsible steps.
- **Optional Blip Bucket sync** — persist all test definitions as a single JSON
  document in a Blip Bucket so they survive reloads and are shared by anyone
  using the same bucket. Without it, tests live in memory only.
- **Light/dark theme** — follows the system by default; press `d` to toggle.

## Getting started

Requires Node and [pnpm](https://pnpm.io/). All commands run from `apps/web/`,
not the repo root.

```bash
cd apps/web
pnpm install
pnpm dev
```

Then open the URL Vite prints. The app starts with two mock tests so there is
something to look at before you connect anything.

## Configuration

Everything is configured on the **Settings** page (`/settings`) and persisted to
`localStorage` under `blip-tester-settings`.

### Blip Bucket connection (storage — optional)

Stores test definitions as one JSON document in a Blip Bucket via the Blip
Commands API.

| Field | Where it comes from |
|---|---|
| Short name | The router's short name (the `<shortName>` in `<shortName>.http.msging.net`) |
| Authorization key | The router's `Authorization` key (`Key ...`) |
| Document id | Any name; defaults to `chatbot-tester-tests` |

**Test connection** checks the credentials and reports whether the document
exists yet — "not found" is fine, it gets created on the first save. Without a
bucket configured the app is fully usable but marked *Local only*, and edits are
lost on reload.

Note that the Commands API is called straight from the browser, so the origin
you run the app on has to be allowed by CORS (it is, when the app is served as a
Blip plugin).

### Debug connection (running tests — required to run)

| Field | Where it comes from |
|---|---|
| Tenant | Your Blip Portal tenant (e.g. `matheus-juca-zukvj`) |
| Bot identifier | The bot's identifier (e.g. `matheusteste6`), without `@msging.net` |
| Router key | The router's `Authorization` key (`Key ...`) — optional, only needed to apply tester variables or to run variable assertions (see below) |

Runs fail with an error status until tenant and bot identifier are set. No
secret key is involved for the connection itself — the runner creates a fresh
guest visitor account per run.

### Run defaults

- **Default step timeout** — 5–20 seconds (default 10s). How long to wait for
  each expected message.
- **Default similarity threshold** — 0–1 (default 0.75). The score an actual
  reply must reach to count as a match.

## How a run works

1. A fresh guest visitor account is created and an authenticated session is
   opened against `wss://<tenant>.ws.0mn.io`. Because the visitor is new every
   run, the bot conversation always starts from the beginning.
2. If the test has any Variables configured, they're applied to the visitor
   next, before the first step's message is sent, via direct HTTPS requests to
   the Commands API rather than over the debug WebSocket session: each context
   variable as its own `set /contexts/<identity>/<name>` command to
   `postmaster@msging.net`, and contact fields/`extras` as a `merge /contacts`
   command to `postmaster@crm.msging.net`. All of these are sent concurrently,
   capped at 10 in-flight requests. Both are authenticated with the Router key
   from Settings — a guest visitor session can't merge its own contact or set
   its own context, so this extra authorization is required whenever the test
   has contact and/or context data to apply. A failure here fails the whole run
   with an `error` status.
3. For each step, the step's `input` is sent and replies are collected. Each
   expected message gets its own wait window, measured from when the previous
   message arrived — not one deadline for the whole step. Expected outputs on
   the **Variable** tab are skipped here: they expect no reply and so don't
   count towards the number of messages the runner waits for.
4. Once the expected number of messages has arrived, the runner waits 5 more
   seconds. If the bot keeps talking, the step **fails** — an unprompted
   trailing message is treated as a mismatch, and the extra messages are shown
   in the results. A step that only has variable assertions is the exception:
   it declares no opinion about what the bot says, so it just waits for the bot
   to go quiet (5 seconds of silence) and extra replies don't fail it.
5. Any variable assertions are checked next, once per distinct variable name,
   with a `get /contexts/<identity>/<name>` command to `postmaster@msging.net`
   over the Commands API — so a Router key is required whenever a test has
   variable assertions. The returned `resource` is compared raw (no trimming or
   case folding). A variable that isn't set fails every condition except
   `not exists`.
6. Each expected/actual pair is scored, and the step passes only if every
   message meets its own threshold **and** every variable assertion passes.
7. Every step runs even after one fails, so you see the whole conversation's
   results rather than stopping at the first mismatch.

Steps end up `passed`, `failed`, or `timeout` (fewer replies than expected); the
test as a whole reports `passed`, `failed`, `error` (e.g. connection or
configuration problems) or `cancelled`.

### Scoring

Text is normalized (lowercased, punctuation stripped, whitespace collapsed) and
scored as an even blend of two measures:

- **Levenshtein similarity** — catches small wording and typo differences.
- **Token-set Jaccard similarity** — catches reordered or partially overlapping
  wording.

Non-text messages (`quickReply`, `menu`, `cta`) are serialized to the JSON
payload the bot would send for that type and compared as strings, so structure
and option labels both count.

## Project layout

```
apps/web/
  src/
    components/
      test-builder/    # authoring UI (step item, message fields, preview, variables)
      test-runner/     # run status badge, score bar
      ui/              # shadcn/ui primitives
    lib/
      blip-bucket-client.ts   # Blip Commands API bucket storage
      blip-debug-client.ts    # Lime-over-WebSocket guest debug session
      message-format.ts       # expected message → bot JSON payload
      similarity.ts           # scoring
      variable-assert.ts      # context-variable conditions and comparison
      test-runner.ts          # drives a test/many tests against a bot
    pages/             # home (test list), test detail, settings
    store/             # settings, tests, run providers
    types/             # test, run, settings, lime
```

## Commands

Run from `apps/web/`:

| Command | What it does |
|---|---|
| `pnpm dev` | Start the Vite dev server |
| `pnpm build` | `tsc -b && vite build` |
| `pnpm preview` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier write over `**/*.{ts,tsx}` |

There is no test runner configured for this repo's own code — the "tests" here
are the chatbot tests the app builds.

## Stack

React 19 · Vite 8 · TypeScript 6 · Tailwind CSS 4 · shadcn/ui (`radix-nova`
style) · lucide-react · react-router 8 · dnd-kit · Inter
