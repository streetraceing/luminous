# Luminous engineering documentation

This directory is the canonical technical documentation for Luminous. It describes the current TypeScript/Vite runtime, its integration contract with Spotify/Spicetify, visual pipeline, settings model, performance policy, and maintenance workflow.

Luminous is not an independent web application. It is injected into Spotify by Spicetify and intentionally reuses Spotify's `Spicetify.React`, `Spicetify.ReactDOM`, Player APIs, LocalStorage, DOM, media elements, and CSS variables. That constraint drives most architectural decisions: every integration point must tolerate delayed availability, DOM replacement, reused video elements, track metadata arriving in stages, and runtime re-evaluation during local development.

## Documents

- [Architecture](./architecture.md) — boot sequence, lifecycle, modules, event/data flow, invariants, and teardown.
- [Background pipeline](./background.md) — image/video double buffering, Canvas capture, source identity, fallback policy, transitions, suspension, and effect layers.
- [Palette engine](./palette.md) — cover sampling, metrics, colour selection, scene/energy/tone selection, caching, cancellation, and CSS output.
- [Settings](./settings.md) — complete setting schema, persistence, batching, UI metadata, presets, CSS classes/variables, and migration behavior.
- [UI and Spotify integration](./ui.md) — React shell, settings dialog, motion controller, shell synchronization, accessibility, and DOM compatibility.
- [Development](./development.md) — scripts, release flow, validation, debugging, compatibility checklist, and change rules.

## Architectural priorities

In descending order:

1. Never interfere with Spotify playback or move/own Spotify's source media nodes.
2. Tear down every listener, observer, timer, animation frame, cloned stream, and mounted React root when the runtime is replaced.
3. Keep artwork visible whenever Canvas/video is unavailable, protected, temporarily unready, or fails to play.
4. Reject stale asynchronous work after track/source changes.
5. Keep visual settings declarative and centralized rather than duplicating defaults in UI and runtime code.
6. Make expensive effects optional and pause avoidable work while Spotify is hidden.
7. Treat Spotify DOM selectors as compatibility boundaries rather than stable application APIs.
