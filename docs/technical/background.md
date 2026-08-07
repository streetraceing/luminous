# Background pipeline

`src/render/background.ts` in 2.2.1 intentionally uses the pre-refactor rendering architecture. The large 2.2.0 compositor rewrite was rolled back because the flicker regression appeared together with that rewrite and survived multiple incremental workarounds.

## Design goal

The renderer follows one conservative rule: Spotify owns Spotify media nodes; Luminous only reads from them and maintains its own small set of background elements. No shell node is re-parented or animated by the renderer.

## DOM structure

`Background.ensureBackground()` lazily creates `#luminous-dynamic-background` with:

- one neutral base layer;
- two `<img>` buffers;
- two `<video>` buffers used for captured Spotify Canvas streams;
- one adaptive-effect container containing mesh, halo, ribbons, and four blobs.

The root is fixed, clipped, pointer-inert, and isolated from Spotify input handling. Media buffers use the same transform/filter path that existed before the 2.2.0 visual refactor.

## Image rendering

Artwork uses two image buffers. `preloadImage()` warms a bounded 24-entry cache. `renderImage()` selects the inactive buffer and uses a monotonic `imageRenderId` so a late load callback from an older track cannot win over a newer request.

A successfully cached image can be activated immediately. A not-yet-loaded image installs one-shot `load`/`error` handlers. On failure, the last valid image remains when possible; otherwise the renderer returns to the neutral base.

## Canvas rendering

Canvas is mirrored using `HTMLVideoElement.captureStream()` into one of two Luminous-owned `<video>` elements. The Spotify source is never paused, moved, or assigned a new source by the renderer.

Before capture the source must be connected, not ended, and have at least `HAVE_CURRENT_DATA`. Captured streams without a video track are discarded. The inactive clone receives `srcObject`, calls `play()`, and only then becomes the active Canvas buffer.

The implementation deliberately matches the known-good pre-refactor behavior instead of the more complicated first-frame/snapshot/grace-window state machine introduced later.

## Pending requests and cancellation

`videoRenderId` invalidates older asynchronous `play()` continuations. The renderer stores the pending source, source key, clone, and artwork fallback. A repeat request for the same pending source only refreshes its fallback; a different request releases the previous pending clone.

## Cleanup

Inactive Canvas clones are cleaned after the fixed 250 ms media transition. Cleanup pauses the clone, stops all `MediaStreamTrack`s, clears `srcObject`/`src`, and calls `load()`.

`destroy()` invalidates pending image/video work, stops all captured streams, removes the dynamic-background root, resets active indices, and emits the final background change.

## Why the 2.2.0 compositor features were removed

The refactor added several independent full-window compositor mechanisms at once: pointer parallax, Orbit transforms, extra grain/vignette/shimmer/sparkle layers, configurable transition timing, visibility suspension, palette handoff orchestration, Canvas snapshotting, and shell-transition guards. Even when each mechanism looked reasonable in isolation, they created many more frame-state combinations during Spotify's own track-change React/media updates.

Because the user-visible regression began exactly after that change set, 2.2.1 restores the known-good renderer rather than adding another compensating state machine. Stability takes precedence over retaining experimental effects.

## Regression rule

Future background changes should be introduced one subsystem at a time and tested specifically across:

1. artwork → artwork;
2. artwork → Canvas;
3. Canvas → artwork;
4. Canvas → Canvas;
5. rapid next/previous spam;
6. Alt+Tab during every transition type;
7. opening/closing Settings during playback.

A change that requires global shell opacity/visibility guards to hide artifacts should be treated as a renderer regression, not as a shell problem.
