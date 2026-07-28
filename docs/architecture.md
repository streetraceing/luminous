# Architecture

Luminous is a Vite-built TypeScript theme for Spicetify. CSS provides the glass visual language; the runtime coordinates Spotify state, adaptive effects, settings, and background media.

## Runtime flow

```text
Spotify Player -- track metadata --> Song API ---------+
                                                       |
Cover artwork --> adaptive colour analysis ------------+--> Background effects
                                                       |
Spotify Canvas / NPV video --> Canvas API --> Background renderer
                                                       |
Settings dialog --> Settings API --> CSS variables and root classes
```

## Main modules

| Area                | Location                   | Responsibility                                                                               |
| ------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| Entry point         | `src/index.ts`             | Loads CSS, exposes the API, registers settings, and mounts the application.                  |
| Application shell   | `src/app/`                 | Mounts small React features using Spotify's React runtime.                                   |
| Player integration  | `src/api/song.ts`          | Waits for the player and emits track or late metadata updates.                               |
| Canvas integration  | `src/api/canvas.ts`        | Observes Canvas and NPV video elements, source changes, visibility, and media readiness.     |
| Adaptive effects    | `src/api/palette.ts`       | Extracts a cached visual profile from the cover and applies colours, scene, tone, and tempo. |
| Background renderer | `src/render/background.ts` | Double-buffers artwork and captured video while hosting the generated effect layers.         |
| Settings            | `src/api/settings.ts`      | Validates, applies, observes, and persists theme options.                                    |
| Styles              | `src/styles/`              | Defines adaptive scenes, components, and Spotify layout overrides.                           |

## Background rendering

The renderer maintains two image and two video elements. New content is prepared in the inactive layer and faded in only after it is usable. Former video layers are released after the transition, including their `MediaStream` tracks.

Spotify image URIs are normalised to the image CDN. Artwork is decoded asynchronously and kept in a bounded preload cache to reduce flashes during track changes.

Canvas and visible long-form NPV videos are mirrored with `captureStream()`; Spotify's source element is never moved or modified. A missing or temporarily empty stream falls back to artwork and can be retried when media readiness changes. Only unsupported or security-restricted sources are remembered as unavailable.

## Adaptive effect analysis

`Palette` draws the cover into a 48 × 48 local canvas. Weighted colour buckets produce distinct primary, secondary, accent, light, and dark colours instead of a single average. The same pass measures saturation, luminance, contrast, hue diversity, and warmth.

Those metrics select an Aurora, Ember, Bloom, Prism, or Halo scene plus an automatic soft, flowing, or vivid tempo. CSS renders the result as a mesh, halo, ribbons, and blurred light forms. Registered colour properties allow the palette to morph smoothly between tracks in Chromium-based Spotify builds.

Every analysis has a request identifier. A track change invalidates older work before it can update CSS. Profiles are cached with a fixed limit, and motion duration scales the generated tempo without changing the selected scene.

## Settings and performance

Settings are normalised before use and applied as CSS variables or root classes. Storage writes are delayed and coalesced. The former manual energy value is normalised to `adaptive` during migration but is no longer shown or used to choose a scene.

DOM observations are coalesced through `requestAnimationFrame`. Media readiness events carry a revision so a temporary Canvas fallback can retry even when Spotify reuses the same `<video>` and URL.

## Build output

`vite.config.ts` produces:

- `dist/theme.js` — the runtime extension.
- `dist/user.css` — the complete stylesheet.

The custom Vite plugin handles local `sync` and `delete` modes. `npm run release` recreates `release/`, copies `color.ini`, and synchronises Marketplace version queries.
