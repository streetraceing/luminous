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

Discovery prefers Spotify's `[data-npv-root] [data-canvas-surface="true"] video` hook (also accepted under `#Desktop_PanelContainer_Id`) and retains `.canvasVideoContainerNPV video` as a legacy fallback. It does not depend on hashed CSS classes. Canvas is selected before full-length NPV video, and Canvas surfaces are explicitly excluded from the long-form fallback even when their video is hidden or ended. Full-length discovery supports both the data root and the legacy panel ID.

Canvas and UI Cinema detection share media exclusion selectors: NPV roots, Canvas surfaces, the main view, player bar, and Luminous-owned background buffers cannot be mistaken for a Cinema overlay. The sidebar marker uses the legacy panel when present, otherwise the NPV data root. The visual frame is the immediate parent of the new Canvas surface; only the legacy container uses a two-level ancestor. Frame styling follows the runtime marker rather than fixed wrapper-depth selectors. The existing 9:14 ratio also has a direct data-surface CSS selector and retains the old legacy selector, so sizing stays active when background settings disable Canvas discovery. Markers are refreshed on structural checks even if React moves the same video without replacing its source, and removed on unmount/disable/destroy.

Canvas discovery is disabled entirely when the dynamic background is off or the source setting is `artwork`. This removes observer/media-event work that cannot produce a visible result.

## Protected long-form NPV video

`CanvasMode = npv-video` bypasses `captureStream()` because DRM/EME media is not reliably capturable. In Video mode the original `<video>` is temporarily moved into `.luminous-background-media-stage`, exactly alongside the artwork and captured Canvas buffers. This escapes the NPV sidebar's stacking context and clipping without changing sidebar ancestors, shell z-index, or Spotify's overflow rules. No media URL, keys, audio state, or playback controls are copied or modified.

Where available, Chromium's state-preserving `moveBefore()` is used; older clients fall back to `insertBefore()` with the same media element. Actual EME playback and Spotify's React player lifecycle must be verified in the target desktop client, especially on older Chromium versions. Reparenting third-party React-owned DOM can conflict with a player update that removes the video node directly; subtree removal and normal Luminous cleanup restore the original node via its saved slot, but do not guarantee compatibility with every Spotify renderer revision.

The original video parent receives a hidden `.luminous-direct-video-anchor` used only for restoration/discovery. The visible `.luminous-direct-video-placeholder` is a separate body-level, pointer-inert overlay, not a child of Spotify's video shell or the background stage. This avoids both zero-size nested wrappers and opaque native shells/pseudo-elements painting over the placeholder. Its real cover `<img>`, dark gradient, neutral fallback, badge, and essential positioning styles are set inline so stale/cached theme CSS does not turn it into empty space.

The overlay is anchored to the original measured video rectangle. A frame/panel-local `ResizeObserver`, passive resize/scroll listeners, and existing discovery updates keep its geometry current. Work is coalesced into requested frames; there is no continuous animation loop or document-wide attribute observer. Clipping follows the viewport, panel and ancestor scrollports; the stable NPV title is excluded. A hidden/closed panel hides the overlay. Updated CSS also hides it while the settings dialog is open.

The frame reserves the original video aspect ratio with a responsive minimum height. Only that minimum-height override is needed; no frame positioning or ancestor stacking rules are changed. Cleanup disconnects observers, removes listeners, cancels pending placement, deletes the overlay/anchor, and restores the original inline minimum-height value/priority. If the original subtree is detached, cleanup restores the video only to that detached subtree, never into another player. Switching between distinct protected player elements restores the outgoing player before preparing the replacement to avoid overlapping frame reservations.

Discovery checks both native NPV media and the promoted video's original slot. A newly mounted native player takes priority. An ended video or removed slot is no longer treated as active; repeated discovery does not unmount a video merely because it now lives in the background. Rapid reactivation cancels delayed restoration and reuses the same slot.

`musicVideoBackground` selects `video` (default) or `artwork` only for full-length NPV video, whether DRM-protected or not. Spotify does not expose a reliable DRM marker here, so the option intentionally follows the `npv-video` mode. Normal Canvas and cinema discovery are unchanged. The global `backgroundSource = artwork` and disabled dynamic background take precedence. Artwork mode returns the original video to its panel and displays the cover behind the interface; no placeholder is needed in that mode. Selecting Artwork explicitly calls `Song.refresh()` to re-read `Spicetify.Player.data.item` instead of relying only on the last `songchange` event. The mode is part of the background render key, so this also repairs an out-of-date background when no video is currently mounted. The same track/image signature guard and image render IDs still prevent redundant events and stale asynchronous image loads.

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

Inactive captured-video buffers are cleaned after the fixed media transition. Cleanup pauses the clone, stops `MediaStreamTrack`s, clears `srcObject`/`src`, and calls `load()`. `destroy()` invalidates pending image/video work, returns all promoted videos to their original slots, stops streams, removes the background root, and resets state.

## Performance regression checklist

Test artwork, Canvas, protected long-form video, Settings, rapid track changes, scroll/navigation, and Alt+Tab. A performance change must not add a permanent document-wide attribute observer, a continuous JavaScript animation loop, or changing palette variables on `<html>`.
