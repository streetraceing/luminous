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

`CanvasMode = npv-video` bypasses `captureStream()` because DRM/EME media is not reliably capturable. Spotify's original `<video>` remains React-owned and is not re-parented. Luminous promotes that same element to a fixed, blurred, pointer-inert viewport background, but only neutralises ancestor properties that establish a fixed containing block (`transform`, `filter`, containment and related compositor hints). Sidebar `overflow`, clipping, positioning and z-index are never changed, so the NPV panel keeps its normal scroll and layout behavior.

The promoted video still belongs to the right-sidebar stacking context. During direct-video mode Luminous therefore elevates the normal Spotify shell regions (`#main-view`, the left sidebar, global navigation, and now-playing bar) above that context instead of trying to tear down the sidebar's own stacking/layout rules. The video remains visually behind the interface while the right sidebar keeps its native scroll/clipping behavior.

Before promotion, Luminous records the rendered height of the NPV video slot. The portal keeps that minimum height while the video is fixed and paints the current artwork into the vacated area, so the panel does not collapse or show an empty black hole. The placeholder geometry, artwork variable, ancestor overrides, and direct-video classes are all removed during cleanup.

## Adaptive effect compositor

The static visual design is unchanged: mesh, halo, ribbons, and four blobs still use the same gradients, blend modes, opacity, scene profiles, and blur strengths.

For performance, each effect is now represented as an animated outer node with a nested `.luminous-background-surface`. The outer node owns transforms; the inner surface owns the gradient and filter. This separation is important for Chromium/Electron: a static blurred surface can be raster-cached while the wrapper is moved by the compositor, instead of coupling transform animation to expensive filtered-gradient paint.

`will-change: transform` is active only while a visible motion mode is actually animating the adaptive scene, rather than reserving compositor layers permanently in Still mode.

Artwork and captured-video motion is also separated from filtered paint. Blur/brightness remains on the media buffers, while Drift/Float moves the shared `.luminous-background-media-stage`. A track switch can therefore swap opacity between buffers without coupling the expensive media filter to the continuously animated transform.

Drift retraces open swing paths with `alternate` and adds slow rotation to blobs and ribbons; Float plays dedicated closed-loop paths forward, so neither mode produces a visible loop seam. Negative animation delays keep nodes sharing a duration from moving in lockstep.

## Palette scope

Adaptive colours, angle/filter controls, scene/energy/tone classes, and animation durations live on `.luminous-background-effects`. They are no longer written to `<html>`. Track-to-track colour transitions therefore invalidate and repaint the background scene only, not Spotify's full UI tree.

## Hidden/settings states

Opening the settings modal pauses decorative CSS animation through `luminous-settings-open` so the scene stays stable while editing. A hidden or minimized window freezes decorative CSS animation through `luminous-visibility-hold`, and the freeze is released two rendered frames after the window returns so the reveal matches the last presented frame instead of jumping to the wall-clock animation phase. Background media streams are left to Chromium's own media scheduling to avoid resume artifacts.

## Cleanup

Inactive captured-video buffers are cleaned after the fixed media transition. Cleanup pauses the clone, stops `MediaStreamTrack`s, clears `srcObject`/`src`, and calls `load()`. `destroy()` invalidates pending image/video work, restores any direct-video bridge, stops streams, removes the background root, and resets state.

## Performance regression checklist

Test artwork, Canvas, protected long-form video, Settings, rapid track changes, scroll/navigation, and Alt+Tab. A performance change must not add a permanent document-wide attribute observer, a continuous JavaScript animation loop, or changing palette variables on `<html>`.
