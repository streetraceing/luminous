# Customisation

Luminous keeps its visual controls inside Spotify so that changes are immediate and survive the next launch.

## Open the settings dialog

Open your profile menu from the avatar in Spotify's top bar and select **Luminous Settings**. Luminous opens a focused, full-screen dialog with a blurred backdrop. Select the backdrop, use the close button, or press <kbd>Esc</kbd> to close it.

The dialog has **Appearance** and **Motion** tabs. It moves keyboard focus into its controls while open and supports arrow keys in the tab list.

## Settings

| Setting               |                 Range | Default | Effect                                                                        |
| --------------------- | --------------------: | ------: | ----------------------------------------------------------------------------- |
| Dynamic background    |              On / Off |      On | Uses the current cover, Canvas, or visible Spotify NPV video as the backdrop. |
| Dynamic palette       |              On / Off |      On | Extracts colours from the current cover and subtly tints Luminous surfaces.   |
| Background blur       |               0-48 px |   24 px | Softens the artwork or video behind Spotify.                                  |
| Background brightness |               30-120% |     75% | Adjusts the intensity of the backdrop.                                        |
| Surface opacity       |                0-100% |     50% | Controls the transparency of the glass-like UI surfaces.                      |
| Surface blur          |               0-32 px |   16 px | Controls blur on navigation and content surfaces.                             |
| Palette strength      |                 0-45% |     24% | Sets how visible the extracted cover colours are.                             |
| Background movement   | Still / Drift / Float |   Drift | Adds a low-impact animation to the active background layer.                   |
| Motion speed          |                8-48 s |    20 s | Sets the duration of one animation cycle.                                     |
| Reduce motion         |              On / Off |     Off | Stops Luminous animations and background cross-fades.                         |

When a Spotify Canvas is available, Luminous uses it in preference to the static cover image. If no Canvas is present, Luminous can also use a visible long-form video from Spotify's Now Playing View (NPV). If a video stream cannot be captured, the theme automatically falls back to the album artwork.

## Dynamic palette

Luminous asks Spicetify to analyse the current cover artwork and uses the extracted colour as a restrained accent in the main view, navigation edge, player edge, and settings dialog. The feature never blocks playback or background rendering: if colour extraction is unavailable or fails, the normal Spotify accent remains in use.

The result for an old track is discarded as soon as playback changes, so fast track changes cannot apply a stale palette.

## Recommended looks

| Goal             |  Blur | Brightness | Surface opacity |
| ---------------- | ----: | ---------: | --------------: |
| Clear artwork    | 12 px |        85% |             35% |
| Balanced default | 24 px |        75% |             50% |
| Calm and subdued | 36 px |        60% |             65% |

These values are only starting points; the best balance depends on the artwork and display brightness. Use **Still** or turn on **Reduce motion** when you prefer a static interface.

## Reset and persistence

**Reset** restores every Luminous setting to its default. Values are stored in Spicetify local storage under `luminous-settings`, so they are retained after Spotify restarts. Luminous batches rapid slider updates before writing them to storage, then flushes a pending change when the page is closed.

## Local theme workflow

From the repository root:

```bash
npm run build
npm run apply
```

Use `npm run revert` to switch back to the `marketplace` theme configured by this project's script.
