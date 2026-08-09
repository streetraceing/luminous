# Adaptive palette engine

`src/api/palette.ts` converts cover artwork into a compact visual profile used by the Luminous background subtree. It does not inspect playback audio and is not beat detection.

## Sampling

Artwork is loaded into a cross-origin `Image`, drawn once to a 48 × 48 in-memory canvas, and read once. The small fixed sample bounds analysis CPU work while preserving enough colour information for scene selection.

Pixels with alpha below 0.45 are ignored. Remaining pixels contribute to global saturation/lightness/contrast/hue-diversity/warmth metrics and to quantized RGB buckets. Near-black and near-white pixels are excluded from candidate buckets so borders and text do not dominate the palette.

## Scene selection

Current scene families are:

- `halo` - low-chroma artwork;
- `prism` - diverse chromatic artwork;
- `bloom` - green-dominant artwork;
- `ember` - warm/red/orange artwork;
- `aurora` - remaining cool palettes.

The same metrics select `soft`, `flow`, or `vivid` energy and `dark`, `balanced`, or `light` tone. Selection is deterministic.

## Stale-work protection and cache

Each analysis has a monotonically increasing `requestId`. A stale async image load cannot apply after a newer request. Profiles are cached by artwork URL with a fixed 24-entry bound; cache hits skip image decode and pixel analysis.

## CSS output and invalidation scope

The engine writes palette colours, effect controls, four animation durations, and scene/energy/tone classes to `.luminous-background-effects` only. It does **not** mutate adaptive palette variables/classes on `<html>`.

That scoping is a major performance boundary: registered colour-property transitions still provide the same smooth colour morph, but style invalidation and gradient repaint are limited to the small background subtree instead of propagating inherited custom-property changes through the entire Spotify document.

`clear()` removes only palette-owned state from the effect container. Media rendering remains independent, so artwork/video stays visible if analysis is disabled or fails.
