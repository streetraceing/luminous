# Customisation

Luminous keeps its visual controls inside Spotify so changes are immediate and persist across launches.

## Open the settings dialog

Open your profile menu from the avatar in Spotify's top bar and select **Luminous Settings**. Select the backdrop, use the close button, or press <kbd>Esc</kbd> to close the dialog.

The dialog has **Appearance** and **Motion** tabs. It moves keyboard focus into its controls while open and supports arrow keys in the tab list.

## Settings

| Setting               | Range                 | Default | Effect                                                                        |
| --------------------- | --------------------- | ------- | ----------------------------------------------------------------------------- |
| Dynamic background    | On / Off              | On      | Uses the current cover, Canvas, or visible Spotify NPV video as the backdrop. |
| Adaptive effects      | On / Off              | On      | Builds an automatic colour scene from the current cover.                      |
| Background blur       | 0–48 px               | 24 px   | Softens the artwork or video behind Spotify.                                  |
| Background brightness | 30–120%               | 75%     | Adjusts the intensity of the backdrop media.                                  |
| Surface opacity       | 0–100%                | 50%     | Controls the transparency of the glass-like UI surfaces.                      |
| Surface blur          | 0–32 px               | 16 px   | Controls blur on navigation and content surfaces.                             |
| Effect intensity      | 0–45%                 | 24%     | Sets the visibility of the adaptive scene.                                    |
| Background movement   | Still / Drift / Float | Drift   | Chooses the overall movement pattern.                                         |
| Motion speed          | 8–48 s                | 20 s    | Scales media movement and the adaptive scene tempo.                           |
| Reduce motion         | On / Off              | Off     | Stops custom animation and background cross-fades.                            |

When a Spotify Canvas is available, Luminous prefers it over the static cover. A visible long-form Now Playing video can also be used. If video capture is unavailable or not ready, the theme keeps the artwork visible and retries when the source becomes playable.

## Adaptive effects

Luminous analyses a small local copy of the cover and extracts several distinct colours together with saturation, contrast, brightness, and colour diversity. These values select one of five scene families automatically:

- **Aurora** for cool blue, cyan, and violet artwork.
- **Ember** for warm red, orange, and gold artwork.
- **Bloom** for green and organic palettes.
- **Prism** for colourful, high-contrast covers.
- **Halo** for restrained or nearly monochrome artwork.

Each scene receives its own colour balance, light placement, and tempo. The analysis never reads or modifies playback audio, so it is visual adaptation rather than beat detection. Results from an old track are discarded as soon as playback changes.

**Effect intensity** controls only the generated light scene. Set it to `0%` to keep the cover or video without added colour. **Background movement** and **Motion speed** remain global preferences; the scene character itself no longer needs manual selection per track.

## Recommended looks

| Goal             |  Blur | Brightness | Surface opacity | Effect intensity |
| ---------------- | ----: | ---------: | --------------: | ---------------: |
| Clear artwork    | 12 px |        85% |             35% |              18% |
| Balanced default | 24 px |        75% |             50% |              24% |
| Calm and subdued | 36 px |        60% |             65% |              12% |

Use **Still** or enable **Reduce motion** for a static interface.

## Reset and persistence

**Reset** restores every visible Luminous setting to its default. Values are stored in Spicetify local storage under `luminous-settings`. Rapid slider updates are batched, and a pending change is flushed when the page closes.

## Local theme workflow

```bash
npm run build
npm run apply
```

Use `npm run revert` to switch back to the `marketplace` theme configured by this project.
