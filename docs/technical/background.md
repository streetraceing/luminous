# Background pipeline

`src/render/background.ts` owns every DOM node created for the dynamic backdrop. Spotify media nodes are treated as read-only sources.

## DOM structure

The renderer lazily creates `#luminous-dynamic-background` containing:

- a neutral base layer;
- two `<img>` layers;
- two cloned `<video>` layers whose `srcObject` is a captured `MediaStream`;
- an effects container with mesh/halo/ribbons/blobs plus shimmer, sparkles, vignette, and grain detail layers.

Two image and two video layers provide double buffering. Incoming media is prepared on the inactive layer and becomes active only when usable. This avoids flashes to an empty source during track changes.

## Image rendering

Artwork sources are converted/loaded without blocking Spotify. `preloadImage()` warms a bounded insertion-ordered cache (`MAX_PRELOADED_IMAGES = 24`). Broken cached images are removed if they report `complete` with zero natural width.

Image rendering uses a monotonically increasing render identifier. If a newer request arrives before an older image finishes, the old callback cannot become active. The inactive image is faded in only after successful load/decode; failure either leaves the already-valid background alone or clears to the base state.

## Video capture

Canvas/NPV video is mirrored with `HTMLVideoElement.captureStream()`. The original element remains where Spotify placed it and is never paused, moved, re-parented, assigned a source, or otherwise controlled by Luminous.

Capture proceeds only when the source video is connected, not ended, and has at least `HAVE_CURRENT_DATA`. The captured stream must contain a video track. The stream is assigned to the inactive clone and `play()` is awaited before transition.

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

A repeat render request for the exact active usable source is a no-op. A repeat request for the exact pending source updates only its artwork fallback. A different request invalidates and releases the pending clone first.

## Stream cleanup

When a video clone is no longer active after the configured cross-fade, `resetVideo()`:

1. pauses the clone;
2. stops every `MediaStreamTrack` in its `srcObject`;
3. clears `srcObject` and `src`;
4. calls `load()` to reset the media element.

The delay equals the current transition duration so the outgoing clone remains alive for the fade but not longer. `destroy()` invalidates all render IDs, clears pending state, stops both clones immediately, removes the root, and returns type to `none`.

## Suspension

`MotionFeature` calls `Background.setSuspended(true)` when Spotify is hidden and `pauseWhenHidden` is enabled. The active cloned video pauses; CSS receives `luminous-runtime-suspended` and pauses custom animations. On visibility return, the clone is resumed defensively. Spotify's own playback source is never paused.

If a new clone becomes active while suspended, it is paused immediately after transition readiness.

## Transitions

`transitionDuration` is normalized to 0–1200 ms and applied to `--luminous-transition-duration`. The same duration controls layer opacity transitions and delayed stream cleanup, keeping visual and resource lifetimes synchronized.

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
