# Settings model

Settings are schema-backed and persisted under the `luminous-settings` LocalStorage key. Each registered setting has a default, normalization function, and optional runtime application callback. The settings dialog is generated from the same schema metadata, so the UI and runtime no longer maintain separate lists of defaults.

## Active settings

| Key                    | Default    | Range / values            | Runtime effect                                                     |
| ---------------------- | ---------- | ------------------------- | ------------------------------------------------------------------ |
| `dynamicBackground`    | `true`     | boolean                   | Enables/disables media and Canvas discovery/work.                  |
| `backgroundSource`     | `auto`     | `auto`, `artwork`         | Enables Canvas discovery or disables it for artwork-only mode.     |
| `dynamicPalette`       | `true`     | boolean                   | Enables adaptive cover-derived lighting.                           |
| `backgroundBlur`       | `24`       | 0–48 px                   | Media blur.                                                        |
| `backgroundBrightness` | `75`       | 30–120 %                  | Media brightness.                                                  |
| `uiOpacity`            | `50`       | 0–100 %                   | Opacity of translucent Spotify surfaces.                           |
| `uiBlur`               | `16`       | 0–32 px                   | Glass-surface blur.                                                |
| `paletteStrength`      | `24`       | 0–50                      | Adaptive-effect opacity.                                           |
| `backgroundMotion`     | `drift`    | `still`, `drift`, `float` | Uses the stable pre-refactor motion modes.                         |
| `motionDuration`       | `20`       | 8–60 s                    | Scales media/effect motion timing.                                 |
| `reduceMotion`         | `false`    | boolean                   | Adds `luminous-reduce-motion`; CSS also honors the OS media query. |
| `backgroundEnergy`     | `adaptive` | compatibility-only        | Preserved normalized legacy value.                                 |

## Removed experimental controls

The following 2.2.0 controls are intentionally no longer registered or shown: `transitionDuration`, `parallax`, `parallaxStrength`, `vignetteStrength`, `grainStrength`, `glassHighlights`, `effectQuality`, `pauseWhenHidden`, and `respectSystemMotion`.

Saved values for removed keys are ignored and disappear on the next persisted settings snapshot. This prevents an older 2.2.0 profile from re-enabling compositor behavior that no longer exists.

## Presets

Presets remain in a dedicated tab and use one batched `setMany()` operation:

- **Balanced** - auto Canvas, adaptive palette, Drift.
- **Cinematic** - brighter media, stronger palette, Float; no experimental compositor layers.
- **Calm** - artwork-only, Still, subdued palette.
- **Performance** - artwork-only, Still, higher surface opacity and lower blur cost.

## Settings UI performance

The modal keeps the performance fixes from the refactor: no fullscreen `backdrop-filter`, sticky header, no synchronous animated-height measurement, and coalesced range application while dragging. Opening Settings may pause Luminous-owned CSS animations through `luminous-settings-open`, but it does not alter Spotify playback or Canvas source nodes.
