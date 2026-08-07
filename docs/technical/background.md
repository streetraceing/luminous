# Background pipeline

`src/render/background.ts` owns every DOM node created for the dynamic backdrop. Spotify media nodes are treated as read-only sources.

## DOM structure

The renderer lazily creates `#luminous-dynamic-background` containing:

- a neutral base layer;
- one media-stage wrapper that owns the expensive blur/brightness filter;
- two `<img>` layers inside the media stage;
- two cloned `<video>` layers whose `srcObject` is a captured `MediaStream`;
- an effects container with mesh/halo/ribbons/blobs plus shimmer, sparkles, vignette, and grain detail layers.

Two image and two video layers provide double buffering. Incoming media is prepared on the inactive layer and becomes active only when usable. The shared media stage means a transition does not require Chromium to maintain two separate full-window blurred surfaces; only opacity is composited per media buffer. This lowers GPU cost and reduces video/filter compositor instability.

## Image rendering

Artwork sources are converted/loaded without blocking Spotify. `preloadImage()` warms a bounded insertion-ordered cache (`MAX_PRELOADED_IMAGES = 24`). Broken cached images are removed if they report `complete` with zero natural width.

Image rendering uses a monotonically increasing render identifier. If a newer request arrives before an older image finishes, the old callback cannot become active. The inactive display image itself is assigned and decoded before opacity changes; successful preload alone is not considered enough. Failure leaves an already-valid background untouched and only falls back to the neutral base when no valid layer exists.

## Video capture

Canvas/NPV video is mirrored with `HTMLVideoElement.captureStream()`. The original element remains where Spotify placed it and is never paused, moved, re-parented, assigned a source, or otherwise controlled by Luminous.

Capture proceeds only when the source video is connected, not ended, and has at least `HAVE_CURRENT_DATA`. The captured stream must contain a video track. The stream is assigned to the inactive clone, `play()` is awaited, and the renderer waits for the clone's first presented video frame (using `requestVideoFrameCallback()` when available) before transition. The frame wait timeout is a failure condition, not a success fallback: a clone that never presents a real frame is discarded and artwork is used instead. This prevents a black/empty compositor frame from becoming visible during Canvas handoff.

If capture/play fails and artwork is known, artwork becomes the fallback. `AbortError` is treated as an interrupted transition rather than a permanent failure.

## Source-specific unsupported cache

Spotify can reuse the same `<video>` DOM object across tracks and replace its media source. Therefore unsupported Canvas state must not be stored as a simple `WeakSet<HTMLVideoElement>`.

Luminous stores a `WeakMap<HTMLVideoElement, Set<string>>`, keyed by both element identity and concrete source URL/key. `SecurityError` and `NotSupportedError` mark only that source as unsupported. A later playable source on the reused element is eligible for capture again.

This distinction prevents one DRM/protected video from disabling Canvas for unrelated later tracks.

## Pending and active identity

The renderer tracks:

- `currentCanvasSource` + `currentCanvasKey` for the active clone;
- `pendingCanvasSource` + `pendingCanvasKey` + pending clone for an in-flight transition;
- `videoRenderId` to invalidate superseded asynchronous `play()` continuations.

A repeat render request for the exact active usable source is a no-op. A repeat request for the exact pending source updates only its artwork fallback. A different request invalidates and releases the pending clone first. Cancelling a pending render also stops its MediaStream immediately, preventing invisible orphan streams after rapid source changes.

## Stream cleanup

When a video clone is no longer active after the configured cross-fade, `resetVideo()`:

1. pauses the clone;
2. stops every `MediaStreamTrack` in its `srcObject`;
3. clears `srcObject` and `src`;
4. calls `load()` to reset the media element.

Cleanup happens after the current transition duration plus a short compositor grace period, so the outgoing clone stays alive through the entire visual fade and is not torn down on the exact transition boundary. `destroy()` invalidates all render IDs, clears pending state, stops both clones immediately, removes the root, and returns type to `none`.

## Suspension

When Spotify is hidden and `pauseWhenHidden` is enabled, CSS receives `luminous-runtime-suspended` and pauses Luminous-owned motion/effect animations. The captured Canvas clone is deliberately **not** force-paused or force-resumed.

This is a stability decision: Chromium can expose an empty compositor frame immediately after resuming a `MediaStream`-backed video, which appears as a flash after Alt+Tab. Hidden documents are already throttled by the browser, so avoiding manual `pause()`/`play()` provides a better visual result without touching Spotify's source video.

## Transitions

`transitionDuration` is normalized to 0–1200 ms and applied to `--luminous-transition-duration`. The same duration controls layer opacity transitions and delayed stream cleanup, keeping visual and resource lifetimes synchronized.

Media-to-media changes use an **occlusion-preserving reveal**, not a symmetric two-sided opacity fade. The last settled layer remains fully opaque at z-index 1 while the prepared incoming layer is placed above it at z-index 2 and animated from opacity 0 to 1. Only after the incoming layer reaches 100% is the old stable layer hidden. This keeps total pixel coverage at 100% throughout the transition. A symmetric `old: 1→0` + `new: 0→1` fade would expose roughly 25% of the dark base at the midpoint because source-over alpha composition is multiplicative; on Luminous's translucent Spotify surfaces that luminance trough looks like a whole-window flash.

The renderer keeps a separate `stableLayer` from the currently requested element. If another song/source arrives while a reveal is still running, the partially visible incoming buffer is discarded and the next valid buffer is revealed over the last fully opaque stable layer. Rapid metadata or Canvas event bursts therefore cannot chain partially transparent transitions.

Both the stable and incoming media elements retain `luminous-background-layer--active` until the reveal settles. This matters because the active class owns motion transforms; removing it on the first transition frame would reset `translate`/`scale` and visibly jump the outgoing media. `Background.change` events expose `phase: 'start' | 'settled'`, allowing other visual systems to commit only after a media layer is fully presented.

## Motion and detail layers

The scene supports four global motion modes:

- `still` — no Luminous movement;
- `drift` — slow alternating translation;
- `float` — looping multi-point translation;
- `orbit` — media orbit/scale plus animated palette elements.

Additional ambient layers:

- shimmer — broad conic highlight;
- sparkles — sparse screen-blended micro highlights;
- vignette — user-controlled edge contrast;
- grain — user-controlled animated film texture.

Pointer parallax translates the whole backdrop by small CSS custom-property offsets. Reduced-motion disables custom animations/transitions. Quality classes progressively remove expensive decorative layers.

## Quality policy

`full` keeps all layers. `balanced` removes sparkles and the fourth blob. `lite` removes ribbons, shimmer, sparkles, grain, and additional blobs and simplifies blur/saturation. The Performance preset also forces artwork-only and still motion, which disables Canvas observation and video capture entirely.

## Track-change handoff

When auto Canvas mode is active and a song changes while a Canvas background is visible, `DynamicBackgroundFeature` gives Spotify a short 420 ms handoff window. The Canvas revision that was current at the exact song-change event becomes a revision floor: it is considered stale for the new song even if the same `<video>` object is still present in React state for another frame. Only a later Canvas revision can cancel the handoff window.

This matters because Spotify emits several media lifecycle events while reusing Canvas DOM. `Canvas` now treats those events only as requests to re-check the source; they no longer force a synthetic revision when element, mode, and source are unchanged. A detected video is exposed only when it is visible, not ended, has current frame data, and has non-zero video dimensions. Transient `emptied`/metadata states therefore become a clean unmount/mount sequence instead of a series of fake playable Canvas changes.

The API separately tracks a visible media candidate from the currently playable Canvas. If Spotify empties a reused `<video>`, it can temporarily stop being eligible as a background while remaining subscribed to `loadeddata`/`canplay`/`playing`. This guarantees that the same DOM element can become eligible again as soon as a real frame appears, without polling and without exposing its empty phase to the renderer.

When the outgoing source is Canvas, `holdCurrentFrame()` first snapshots the last presented clone frame into an internal raster canvas. The raster becomes the stable lower layer for the handoff, so Spotify can end or reuse the original MediaStream without turning the outgoing background black. If raster capture is unavailable, the captured Luminous clone is paused as a fallback; the Spotify-owned source video is never paused.

If a fresh playable Canvas appears inside the grace window, the renderer can hand off directly from that frozen outgoing frame to the new first-presented frame. If it does not, preloaded artwork is revealed over the last settled layer after the grace period and remains valid until a later Canvas is genuinely ready. There is never an intentional transition through an empty background.

Adaptive palette changes are intentionally decoupled from the raw `songchange` event. The next artwork profile is warmed in advance, but the old palette stays active while media is changing. Only a `Background` `settled` event can schedule the next profile, and the commit is deferred briefly so large mix-blend/blur scene changes do not share the same compositor frame as media cleanup. Palette colors interpolate through registered custom properties; the effects layer is never faded to zero during a song change because that luminance dip would be visible through Spotify's translucent surfaces.
