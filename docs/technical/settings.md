# Settings model

Settings are defined once in `src/config/settings.ts`. The same schema drives normalization/defaults/runtime application and the settings dialog metadata. This removes the old failure mode where UI defaults and runtime defaults drifted apart.

## Persistence

`Settings` stores JSON in `Spicetify.LocalStorage` under `luminous-settings`.

Initialization reads the saved object, normalizes every registered setting, applies every value, then writes the normalized representation back. Invalid values fall back to defaults. Unknown legacy keys are preserved in the in-memory saved map and written back unless they are not a primitive setting value; the legacy `backgroundEnergy` key is registered and normalized to `adaptive` for compatibility.

Writes are delayed by 180 ms and coalesced. `setMany()`/reset operations use an internal batch depth so a preset does not write storage once per field. Pending persistence is flushed on `pagehide` and before Settings teardown.

Subscribers can request immediate delivery and receive an unsubscribe function. Listener exceptions are contained and logged.

## Complete reference

| Key                    | Default    | Range/values                       | Runtime effect                                                       |
| ---------------------- | ---------- | ---------------------------------- | -------------------------------------------------------------------- |
| `dynamicBackground`    | `true`     | boolean                            | Shows/hides dynamic media and manages base/surface variables.        |
| `backgroundSource`     | `auto`     | `auto`, `artwork`                  | Chooses Canvas preference; artwork disables Canvas observers.        |
| `dynamicPalette`       | `true`     | boolean                            | Enables cover-driven adaptive effects.                               |
| `backgroundBlur`       | `24`       | 0–48 px                            | `--luminous-background-blur`.                                        |
| `backgroundBrightness` | `75`       | 30–120 %                           | Media brightness multiplier.                                         |
| `uiOpacity`            | `50`       | 0–100 %                            | Translucent surface opacity.                                         |
| `uiBlur`               | `16`       | 0–32 px                            | Glass backdrop blur.                                                 |
| `paletteStrength`      | `24`       | 0–50                               | Maps to generated scene opacity.                                     |
| `vignetteStrength`     | `28`       | 0–70 %                             | Edge-vignette opacity.                                               |
| `grainStrength`        | `5`        | 0–20 %                             | Film-grain opacity.                                                  |
| `glassHighlights`      | `true`     | boolean                            | Toggles subtle surface edge highlights.                              |
| `backgroundMotion`     | `drift`    | `still`, `drift`, `float`, `orbit` | Exclusive motion root class.                                         |
| `motionDuration`       | `20`       | 8–60 s                             | Global media motion and palette tempo scale.                         |
| `transitionDuration`   | `420`      | 0–1200 ms                          | Cross-fade CSS and stream cleanup timing.                            |
| `parallax`             | `true`     | boolean                            | Enables pointer depth translation.                                   |
| `parallaxStrength`     | `8`        | 0–20 px                            | Pointer depth amplitude.                                             |
| `reduceMotion`         | `false`    | boolean                            | Forces custom motion off.                                            |
| `respectSystemMotion`  | `true`     | boolean                            | Honors `prefers-reduced-motion`.                                     |
| `pauseWhenHidden`      | `true`     | boolean                            | Pauses Luminous CSS motion while hidden; Canvas clone stays running. |
| `effectQuality`        | `full`     | `full`, `balanced`, `lite`         | Selects visual layer cost.                                           |
| `backgroundEnergy`     | `adaptive` | compatibility-only                 | Legacy normalized value; not user-editable.                          |

## Presets

Presets live in their own settings tab and are declarative partial setting snapshots applied with one `setMany()` call:

- Balanced — current recommended defaults.
- Cinematic — brighter media, lower surface opacity, stronger palette, Orbit motion, deeper parallax, longer fades.
- Calm — artwork-only, still motion, subdued effects, balanced quality.
- Performance — artwork-only, still motion, lite quality, grain/highlights/parallax off, short fade.

Presets deliberately do not overwrite accessibility preferences such as `reduceMotion` or `respectSystemMotion`.

## Root class contract

Exclusive classes:

- source: `luminous-source-auto`, `luminous-source-artwork`
- motion: `luminous-motion-still`, `-drift`, `-float`, `-orbit`
- quality: `luminous-quality-full`, `-balanced`, `-lite`

Independent state classes include `hideDynamicBackground`, `luminous-glass-highlights`, `luminous-parallax-enabled`, `luminous-reduce-motion`, and `luminous-runtime-suspended`.

Palette owns its own scene/energy/tone classes.

## Adding a setting

A new user-visible setting should normally require exactly three schema changes:

1. add the typed key to `LuminousSettingValues`;
2. add its `settingDefinitions` entry with normalization/default/application;
3. add `settingsUi` metadata.

If it belongs in reset behavior, no separate list is required: the menu derives resettable keys from `settingsUi`. If a preset should control it, add the value to selected presets. Lifecycle cleanup must include any new root class/CSS variable that is not already removed by the owning module.

## Settings UI performance

The modal intentionally avoids a fullscreen `backdrop-filter`; blurring an actively animated Spotify scene underneath the whole viewport is one of the most expensive possible compositor paths. Opening the modal adds `luminous-settings-open`, which pauses Luminous decorative CSS animation and suppresses pointer-parallax work while the user edits settings.

Range controls keep their local label/input responsive but coalesce expensive runtime application to roughly one update every 32 ms while dragging, then flush the exact final value on pointer/key release or blur. Tab changes no longer measure old/new panel heights with synchronous layout reads. Rows use containment/content visibility where supported. The modal header is sticky inside the settings scroller.
