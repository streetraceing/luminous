# Luminous - quick guide

Open **Luminous → Settings** in Spotify.

- **Presets** - ready-made profiles.
- **Appearance** - background, Canvas/artwork, blur, brightness, surface opacity, and adaptive-light strength.
- **Motion** - Still / Drift / Float, speed, and Reduce motion.
- **Advanced** - diagnostics and runtime tools.

In `2.2.3` the visual pipeline is intentionally reduced to the proven stable path: parallax, Orbit, grain/vignette/detail-quality, and configurable cross-fade from the previous refactor were removed to eliminate track-change interface flicker.

- Protected long-form NPV video uses the original Spotify video element directly as the background instead of DRM-incompatible stream capture; Spotify's main shell stays above the promoted video, the right sidebar keeps native scrolling/clipping, and the vacated video slot keeps its size with the current artwork as a placeholder.
