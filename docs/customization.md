# Customisation

Luminous keeps its visual controls inside Spotify so that changes are immediate and survive the next launch.

## Open the settings panel

Select the brightness icon in Spotify's top bar. Luminous opens a focused, full-screen settings dialog with a blurred backdrop, so the controls remain easy to use without losing the context of the current artwork. Select the backdrop, use the close button, or press <kbd>Esc</kbd> to close it.

The dialog moves keyboard focus into its controls while open and restores focus to the top-bar button when it closes.

## Settings

| Setting               |    Range | Default | Effect                                                   |
| --------------------- | -------: | ------: | -------------------------------------------------------- |
| Dynamic background    | On / Off |      On | Uses the current cover art or Canvas as the backdrop.    |
| Background blur       |  0–48 px |   24 px | Softens the artwork or video behind Spotify.             |
| Background brightness |  30–120% |     75% | Adjusts the intensity of the backdrop.                   |
| UI opacity            |   0–100% |     50% | Controls the transparency of the glass-like UI surfaces. |

When a Spotify Canvas is available, Luminous uses it in preference to the static cover image. If Canvas playback cannot be captured, the theme automatically falls back to the album artwork.

## Recommended looks

| Goal             |  Blur | Brightness | UI opacity |
| ---------------- | ----: | ---------: | ---------: |
| Clear artwork    | 12 px |        85% |        35% |
| Balanced default | 24 px |        75% |        50% |
| Calm and subdued | 36 px |        60% |        65% |

These values are only starting points; the best balance depends on the artwork and display brightness.

## Reset and persistence

**Reset** restores all four settings to their defaults. Values are stored in Spicetify's local storage under `luminous-settings`, so they are retained after Spotify restarts. Luminous batches rapid slider updates before writing them to storage, then flushes a pending change when the page is closed.

## Local theme workflow

From the repository root:

```bash
npm run build
npm run apply
```

Use `npm run revert` to switch back to the `marketplace` theme configured by this project's script.
