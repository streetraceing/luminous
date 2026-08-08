# Adaptive palette engine

`src/api/palette.ts` converts cover artwork into a compact visual profile used entirely through CSS variables and root classes. It does not inspect playback audio and is not beat detection.

## Sampling

Artwork is loaded into a cross-origin `Image`, drawn to a 48 × 48 in-memory canvas, and read once. Downsampling is intentional: it bounds CPU work while preserving enough spatially aggregated colour information for scene selection.

Pixels with alpha below 0.45 are ignored. Remaining pixels contribute to two related analyses:

- global image metrics, weighted by alpha and saturation;
- quantized colour buckets using the upper 3 bits of each RGB channel.

Near-black and near-white pixels are excluded from colour buckets so borders/text do not dominate the palette, while they can still influence overall lightness/contrast metrics.

## Global metrics

The pass derives:

- average saturation;
- average lightness;
- lightness variance converted to bounded contrast;
- hue diversity from the inverse magnitude of a saturation-weighted circular hue vector;
- warmth from red/green versus blue contribution.

A visual chroma score combines dominant saturation with image saturation and contrast.

## Colour candidates

Each bucket becomes an average RGB candidate with HSL and accumulated weight. The top 36 candidates are retained.

Primary favours both bucket weight and saturation. Secondary and accent are selected for colour distance and lightness contrast from previous anchors. If a sufficiently distinct real candidate does not exist, a harmony colour is synthesized from the anchor hue.

Scene-specific normalization limits saturation and lightness to useful ranges before producing final primary, secondary, and accent colours. Light/dark support colours are derived by mixing the brightest/darkest selected colour toward white/black.

## Scene selection

Current automatic scene families:

- `halo` - low-chroma artwork;
- `prism` - diverse, chromatic artwork;
- `nebula` - dark-to-mid violet/magenta artwork with useful chroma;
- `bloom` - green-dominant artwork;
- `ember` - warm/red/orange artwork or positive warmth metric;
- `aurora` - remaining cool palettes.

Scene selection is deterministic for the extracted metrics; there is no random visual identity change between launches.

## Energy and tone

The same metrics select an energy class (`soft`, `flow`, or `vivid`) and tone (`dark`, `balanced`, or `light`). These classes alter opacity, filters, and motion character without changing the user's global motion preference.

The profile also stores effect angle, saturation/brightness/contrast multipliers, and four base animation durations. `motionDuration` scales those durations globally via `setMotionDuration()`.

## Stale-work protection

Every analysis is associated with a monotonically increasing `requestId`. `cancel()` increments it. Before an asynchronous extraction applies anything, its captured ID must still match. Track changes therefore cannot allow a slow previous image load to overwrite the new track's palette.

`DynamicBackgroundFeature` cancels immediately on normalized song changes before scheduling the new artwork.

## Cache

Profiles are cached by artwork source with a fixed 24-entry bound. A cache hit skips image decoding and pixel analysis. Re-applying the already-active source is also a no-op while the palette class remains present.

## CSS output

The engine applies:

- `--luminous-palette-primary`
- `--luminous-palette-secondary`
- `--luminous-palette-accent`
- `--luminous-palette-light`
- `--luminous-palette-dark`
- angle/filter custom properties
- four duration custom properties
- one scene class
- one energy class
- one tone class
- `luminous-dynamic-palette`

`clear()` cancels outstanding work, forgets the active profile/source, removes the palette class/effect classes, and removes owned variables. Media rendering remains independent, so artwork/video stays visible when adaptive analysis is disabled or fails.
