# Development, validation, and performance

## Toolchain

The project is TypeScript + Vite. React is a development type dependency only; production uses Spotify's React/ReactDOM runtime.

Common development commands:

```bash
npm install
npm run prettier:write
npm run typecheck
npm run lint:check
npm run build
npm run check
npm run watch
npm run apply
npm run revert
```

`npm run check` is the non-mutating validation path: typecheck, lint check, then build. Use `npm run lint:fix` only when autofixes are intentionally wanted.

## Repository agent rules

The root `AGENTS.md` is authoritative for automated changes in this repository. In particular:

1. update relevant documentation when architecture, runtime behavior, settings, performance, workflow, or user-facing behavior changes materially;
2. preserve the root `README.md` visual style/structure and change only facts when necessary;
3. version/release automation is operator-owned. Never manually change the project version and never run, edit, create, or replace `vite/releaseScript.ts`, `npm run release`, npm version commands, or equivalent automation;
4. end the reply to every change request with a brief commit-style message on its own line (`<type>: <summary>` using types such as `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, or `build`) that the operator can reuse as a git commit subject; the message is report-only, and git commits are created only when the user explicitly asks for that.

## Linting ambient Spicetify declarations

`src/types/**/*.d.ts` describes the external Spotify/Spicetify runtime. Some upstream-compatible surfaces intentionally use `any`; ESLint disables `@typescript-eslint/no-explicit-any` only for those declaration files. Application/build TypeScript remains under the recommended rule set.

## Performance architecture

The most important CPU rule is to avoid multiplying Spotify/ad-block DOM churn.

- `DomPulse`: one global child-list observer, no global attribute observation, and no duplicate processing of records already inside `#main-view`. Retained records are bounded; saturated streams slow to roughly 4-5 dispatches per second and force a complete catch-up only about every 750 ms.
- `MainViewPulse`: one `#main-view` child-list observer shared by all page synchronizers with the same bounded/filterable saturation policy.
- local attributes: only the one playlist source, left-sidebar class, and `<html>` Cinema transition attributes are observed directly.
- Home sizing uses `ResizeObserver` on measured elements.
- Canvas uses structural pulses plus events from only the currently selected video.
- palette variables/classes live on `.luminous-background-effects`, not `<html>`.
- gradient blur is painted on static inner surfaces while transforms animate outer wrappers; artwork/captured-video blur is similarly separated from Drift/Float motion through a shared media-stage wrapper.
- INFO logging is disabled by default to avoid console serialization cost in normal use; warnings/errors remain enabled.

## Profiling with diagnostics

Use **Luminous Settings → Advanced → Copy diagnostics**. The `performance` object includes counters for `domPulse` and `mainViewPulse`.

During an ad-block mutation storm, high `mutationBatches`/`observedRecords` values can be normal. What should remain bounded is `frames` and especially `dispatchedListeners`: coalesced processing should grow much more slowly than raw mutations. `ignoredMainViewRecords` confirms that the global pulse is not duplicating work owned by `MainViewPulse`. `saturatedFrames` means the bounded queue stopped retaining additional individual records; `fullSyncFrames` should remain much lower and represents the periodic catch-up used for eventual consistency.

When profiling in Chromium DevTools, distinguish:

- scripting: observer callbacks, selector queries, React state updates;
- rendering/style: relational selectors and global custom-property invalidation;
- painting: gradients, blur, `backdrop-filter`;
- compositing: transform animation and media layers.

A new optimization should target the measured category rather than blindly reducing visual settings.

## Validation order

For source changes:

1. format;
2. run `npm run typecheck`;
3. run `npm run lint:check`;
4. run `npm run build`;
5. manually test artwork/Canvas/protected video, track changes, navigation/scrolling, Settings, reduced motion, hide/show Spotify, and hot reinjection.

For package handoff archives, additionally validate `.packagemanifest.json` and `.packageshift` with `@streetraceing/package` when available. Reserved metadata must not be listed as project payload.

## Runtime debugging

Useful checks:

- `Luminous.Background.getType()` - `none`, `image`, or `canvas`;
- `Luminous.Canvas.get()` - selected Spotify source/mode/revision;
- `Luminous.Song.getSync()` - normalized current track;
- `Luminous.Settings.snapshot()` - effective settings;
- `Luminous.Diagnostics.toText()` - complete report including pulse counters.

INFO logs can be enabled temporarily through `Luminous.Logger.enableLevel('INFO')` when tracing lifecycle events. Keep them disabled during performance measurement.

## Compatibility philosophy

Spotify DOM is an unstable dependency. Prefer narrow reversible integration and graceful fallback. Every listener, observer, timer, animation frame, React root, and MediaStream must have an explicit cleanup path. Do not compensate a renderer problem with broad shell opacity/visibility rewrites.
