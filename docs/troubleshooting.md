# Troubleshooting

For users: open **Luminous Settings → Advanced → Copy diagnostics** and include the copied report with the problem description.

For maintainers, build failures, Canvas fallbacks, Spotify DOM compatibility, and runtime diagnosis are documented in [technical development and troubleshooting](./technical/development.md).

## Black / empty background after a Spotify update

Symptom: the entire background is black or flat-coloured even though the player is playing a track, the splash never hands off to the dynamic scene, and **Luminous Settings → Advanced → Copy diagnostics** shows `"uiHealth": "booting"` and `"background": "none"`.

Cause: Spotify 1.3.3 (Oct 2026) rotated the hashed CSS-module class that Spicetify aliases to `Root__top-container`. Spicetify shipped the new css-map entry only in **v2.45.2** (PR #3996). On older Spicetify the canonical `.Root__top-container #main-view` shell selector stops matching, `uiHealth` stays on `"booting"`, and `DynamicBackgroundFeature` destroys the background on every frame.

Two fixes, in order:

1. **Upgrade Spicetify to 2.45.2 or later.** This is the real fix — it restores the alias so the canonical selector matches again. Run `spicetify upgrade` (or reinstall) and then `spicetify apply`.
2. **Update Luminous.** `uiMountWatcher` no longer depends solely on `.Root__top-container #main-view`. It falls back through `#main-view`, `[data-testid="main-view"]`, and `.main-view-container` (all set directly in Spotify JSX, immune to hash rotation), and additionally promotes `uiHealth` to `"ready"` once the Spicetify Player has loaded a track even if no shell selector matches. The dynamic background therefore renders even on an outdated Spicetify, though upgrading Spicetify is still recommended so the rest of the theme keeps its visual hooks.

The diagnostics field `runtime.shellSelector` shows which selector the watcher matched. `null` means none matched and the Player-based fallback is in effect.

## Track-change stutter or increasing UI lag

The performance fixes address several independent paths:

- A playlist header reused as its own background source could mirror its composed gradient back into itself, growing the gradient list and scheduling another update every frame. The bridge now leaves that native header alone.
- Animated palette colour/filter properties repainted large blurred gradients during track changes. Fixed-profile effect buffers now dissolve through opacity, retaining the existing gradients, blur strengths, and motion modes.
- Superseded palette image requests could still decode and sample after a skip, while decoded artwork remained in a 24-entry preload cache even after background destruction. Obsolete requests are cancelled, image waits/swap frames are invalidated together, and the preload cache is limited to four entries/eight megapixels and cleared on destruction.
- Unrelated NPV text/card changes could trigger video discovery, and a missing main-view ID could lose the local observer boundary. Media filters now inspect actual media structure changes, and both pulse services support the data-testid fallback.

These are source-level fixes, not a diagnosis of every Spotify renderer/GPU combination. If lag remains after updating the theme, include **Copy diagnostics**, the Spotify and Spicetify versions, display resolution/scaling, and whether it happens with artwork, Canvas, or full-length video. A short desktop performance recording is needed to distinguish remaining scripting, gradient/filter raster, and video-compositing costs. The local browser tests do not validate Spotify DRM/EME playback.
