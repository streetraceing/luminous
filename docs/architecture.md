# Architecture

Luminous is a Vite-built TypeScript theme for Spicetify. The CSS provides the glass visual language; the small runtime script coordinates Spotify state, settings, and the dynamic background.

## Runtime flow

```text
Spotify Player ── song changes ──> Song API ──> Dynamic background feature
                                                   │
Spotify Canvas ─ video mount/change ─> Canvas API ─┤
                                                   v
                                           Background renderer
                                                   │
                                                   v
                                      image or captured video layers

Settings panel ──> Settings API ──> CSS variables and root classes
```

## Main modules

| Area                | Location                   | Responsibility                                                              |
| ------------------- | -------------------------- | --------------------------------------------------------------------------- |
| Entry point         | `src/index.ts`             | Loads CSS, exposes the API, registers settings, and mounts the application. |
| Application shell   | `src/app/`                 | Mounts small React features using Spotify's own React runtime.              |
| Player integration  | `src/api/song.ts`          | Waits for the Spicetify player and emits current-track updates.             |
| Canvas integration  | `src/api/canvas.ts`        | Observes the DOM for Spotify Canvas video elements.                         |
| Background renderer | `src/render/background.ts` | Double-buffers image and video layers and cross-fades between them.         |
| Settings            | `src/api/settings.ts`      | Validates, applies, observes, and persists theme options.                   |
| Styles              | `src/styles/`              | Defines base variables, components, and Spotify layout overrides.           |

## Background rendering

The renderer maintains two image and two video elements. New content is prepared in the inactive layer, then faded in once it is usable. The former video layer is released after the transition, stopping its media tracks so it does not continue consuming resources.

Images are decoded asynchronously and kept in a small, capped preload cache. This prevents visible flashes during song changes while keeping the cache bounded.

For Canvas, the renderer requests `captureStream()` from Spotify's existing video element. If the browser does not provide a stream or playback fails, it displays the track image instead. The source Canvas is never moved or modified.

## Settings and performance

Settings are normalised before use, constrained to their supported ranges, and applied as CSS variables or root classes. Slider changes are reflected immediately in CSS. Storage writes are delayed briefly and coalesced, so dragging a slider does not repeatedly serialize and write the same settings object. A pending change is written when the page closes.

The DOM observers used for Canvas and Spotify UI changes schedule their work through `requestAnimationFrame`. Multiple mutations in the same frame therefore result in one detection pass.

## Build output

`vite.config.ts` produces the files required by Spicetify:

- `dist/theme.js` - the runtime extension.
- `dist/user.css` - the complete stylesheet.

The `sync` and `delete` build modes are handled by the custom Vite plugin in `vite/spicetifySyncPlugin.ts`; the `apply` and `revert` npm scripts use those modes to keep the local Spicetify theme directory in sync.
