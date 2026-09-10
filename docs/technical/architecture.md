# Runtime architecture

## Execution model

`src/index.ts` is the runtime entry point. Vite bundles TypeScript and eagerly includes every CSS file under `src/styles`.

Boot order:

1. destroy an already injected Luminous runtime if present;
2. expose the new `window.Luminous` API;
3. mark the runtime active;
4. register and initialize settings;
5. start `Song.init()`;
6. mount the React feature shell through Spotify's own React/ReactDOM runtime.

## Feature shell

`App` contains:

- `SplashFeature` - startup status only; it does not keep a document-wide DOM observer alive after boot;
- `SynchronizeFeature` - Spotify DOM compatibility and page-state synchronization;
- `VisibilityHoldFeature` - freezes ambient CSS animation while Spotify is hidden and releases the hold two rendered frames after the window returns;
- `DynamicBackgroundFeature` - joins Song, Canvas, Palette, Background, settings, and UI health;
- `ThemeMenuFeature` - settings modal and diagnostics.

There is no always-running JavaScript motion loop. Visible motion is CSS-driven.

## DOM observation model

Ad blockers and Spotify both mutate the DOM frequently. Luminous therefore avoids independent document-wide observers per feature.

`DomPulse` owns the single broad **structural** observer. It watches `childList` changes only; global `class`, `style`, `src`, and other attribute churn is deliberately excluded. Mutation records are bounded and coalesced. Mutations whose target is already inside `#main-view` are ignored by this global path because `MainViewPulse` owns that subtree. Sparse changes are handled quickly; saturated ad-block churn is slowed to about one dispatch every 220 ms, and an unconditional catch-up is performed only about every 750 ms. Both pulse services disconnect their MutationObservers while the document is hidden, discard queued DOM churn, then reconnect and force one refresh when it becomes visible again.

`MainViewPulse` owns one observer for the `#main-view` subtree. Playlist/header/page-state consumers share it instead of each creating another subtree observer. It uses the same bounded/filterable and saturation-aware model, so unrelated ad-block insertions do not fan out into every page synchronizer.

Narrow state still uses narrow observers where they are cheaper and more precise:

- the current playlist background source: `style`/`class` only on that one element;
- the left sidebar: `class` only on `#Desktop_LeftSidebar_Id`;
- Home measurements: `ResizeObserver` on the two measured elements;
- Cinema transition cleanup: a small attribute observer on `<html>` only;
- the currently selected Canvas video: media events only.

This architecture is specifically intended to prevent an ad blocker mutation storm from waking every Luminous feature on every frame.

## CSS invalidation boundaries

Adaptive palette variables and scene classes are applied to `.luminous-background-effects`, not `<html>`. A song change therefore invalidates only the Luminous background subtree instead of forcing inherited colour custom properties through Spotify's entire DOM.

Page-specific Spotify styling uses runtime state classes such as `luminous-page-home`, `luminous-page-artist`, and `luminous-page-playlist`. Broad relational selectors on `#main-view` are avoided where a small synchronization bridge can express the same state more cheaply.

## Render/compositor boundary

The adaptive scene keeps the same mesh/halo/ribbon/blob appearance, but each animated node is split into two responsibilities:

- the outer node owns geometry and transform animation;
- `.luminous-background-surface` owns the expensive gradient and blur/filter paint.

The filter surface is static between palette changes, which lets Chromium cache the rasterized blur while compositing only the moving wrapper. The artwork/captured-video buffers use the same principle: their expensive blur remains on the media elements while Drift/Float transform animation is applied to a shared `.luminous-background-media-stage` wrapper. This preserves scene quality while reducing repeated paint work and avoids restarting the media motion animation on every buffer swap.

## Hot replacement

`window.Luminous.destroy()` unmounts React, destroys Background/Canvas/Song, clears Palette and Settings resources, destroys both pulse services, and removes owned root state. Every new observer, timer, animation frame, media listener, or stream must have a matching teardown path.

## Performance invariants

New runtime work should follow these rules:

1. never react to document-wide attribute mutations;
2. never run a continuous JavaScript animation loop for decorative motion;
3. coalesce structural DOM work and cap retained mutation records;
4. scope changing CSS variables/classes to the smallest owning subtree;
5. keep expensive filter paint separate from transform-only animation when possible;
6. disable Canvas discovery when the dynamic background is disabled or artwork-only mode is selected;
7. preserve Spotify media ownership and provide artwork fallback when video is unavailable.
