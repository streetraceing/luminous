# Background pipeline

## DOM structure

`Background.ensureBackground()` lazily creates `#luminous-dynamic-background` with:

- one neutral base layer;
- one `.luminous-background-media-stage` wrapper;
- two artwork `<img>` buffers inside that stage;
- two captured-Canvas `<video>` buffers inside that stage;
- one adaptive-effect container containing mesh, halo, two ribbons, and four blobs.

The root is fixed, clipped, pointer-inert, isolated, and style/paint contained.

## Image rendering

Artwork uses two buffers. `preloadImage()` keeps a bounded 24-entry cache. `renderImage()` always prepares the currently inactive buffer, waits for that actual `<img>` element to finish loading/decoding, and only then commits it as the active buffer. A monotonic `imageRenderId` prevents a late image callback from an older request from overwriting a newer track.

The active buffer index is committed inside `transitionTo()` after the renderer has compared the incoming element with the previously visible element. This ordering is important: committing the index earlier makes `get()` report the incoming buffer as already active and incorrectly turns image-to-image (and captured Canvas-to-Canvas) transitions into no-ops. The previous buffer therefore remains visible until the incoming buffer is ready, after which the existing opacity transition performs the hand-off.

## Normal Canvas

Normal Spotify Canvas is mirrored through `HTMLVideoElement.captureStream()` into one of the two Luminous-owned video buffers. A source must be connected, not ended, and have current frame data. Streams with no video track are discarded. Pending video work is protected by `videoRenderId`; stale asynchronous `play()` continuations cannot win.

Canvas discovery is disabled entirely when the dynamic background is off or the source setting is `artwork`. This removes observer/media-event work that cannot produce a visible result.

## Protected long-form NPV video

`CanvasMode = npv-video` bypasses `captureStream()` because DRM/EME media is not reliably capturable. Spotify's original `<video>` remains React-owned and is not re-parented. Luminous promotes that same element to a fixed, blurred, pointer-inert viewport background, but only neutralises ancestor properties that establish a fixed containing block (`transform`, `filter`, containment and related compositor hints). Sidebar `overflow`, clipping, positioning and z-index are never changed, so the NPV panel keeps its normal scroll and layout behavior. While the original video is promoted, the NPV portal uses the current artwork as a lightweight visual placeholder instead of leaving a black/empty media area. All temporary inline overrides and placeholder state are restored during cleanup.

## Adaptive effect compositor

The static visual design is unchanged: mesh, halo, ribbons, and four blobs still use the same gradients, blend modes, opacity, scene profiles, and blur strengths.

For performance, each effect is now represented as an animated outer node with a nested `.luminous-background-surface`. The outer node owns transforms; the inner surface owns the gradient and filter. This separation is important for Chromium/Electron: a static blurred surface can be raster-cached while the wrapper is moved by the compositor, instead of coupling transform animation to expensive filtered-gradient paint.

`will-change: transform` is active only while a visible motion mode is actually animating the adaptive scene, rather than reserving compositor layers permanently in Still mode.

Artwork and captured-video motion is also separated from filtered paint. Blur/brightness remains on the media buffers, while Drift/Float moves the shared `.luminous-background-media-stage`. A track switch can therefore swap opacity between buffers without coupling the expensive media filter to the continuously animated transform.

## Palette scope

Adaptive colours, angle/filter controls, scene/energy/tone classes, and animation durations live on `.luminous-background-effects`. They are no longer written to `<html>`. Track-to-track colour transitions therefore invalidate and repaint the background scene only, not Spotify's full UI tree.

## Hidden/settings states

When the document is hidden or the settings modal is open, only decorative CSS animation is paused. Background media streams are left to Chromium's own media scheduling to avoid resume artifacts.

## Cleanup

Inactive captured-video buffers are cleaned after the fixed media transition. Cleanup pauses the clone, stops `MediaStreamTrack`s, clears `srcObject`/`src`, and calls `load()`. `destroy()` invalidates pending image/video work, restores any direct-video bridge, stops streams, removes the background root, and resets state.

## Performance regression checklist

Test artwork, Canvas, protected long-form video, Settings, rapid track changes, scroll/navigation, and Alt+Tab. A performance change must not add a permanent document-wide attribute observer, a continuous JavaScript animation loop, or changing palette variables on `<html>`.
