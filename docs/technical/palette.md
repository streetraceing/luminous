# Adaptive palette engine

`src/api/palette.ts` converts cover artwork into a compact visual profile used by the Luminous background subtree. It does not inspect playback audio and is not beat detection.

## Sampling

Artwork is loaded into a cross-origin `Image` and asynchronously decoded before it is drawn once to a 48 × 48 in-memory canvas and read once. The small fixed sample bounds analysis CPU work while preserving enough colour information for scene selection.

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

Each analysis has a monotonically increasing `requestId` and an abortable image request. Superseding, clearing, or cancelling a request detaches its handlers and source; a stale load/decode cannot reach pixel sampling or apply after a newer request. Returning to the currently applied cached cover also cancels another pending cover. Song changes with the same artwork URL leave relevant work alive because the React image dependency will not change. Profiles are cached by artwork URL with a fixed 24-entry bound; cache hits skip image decode and pixel analysis. These compact profile objects are separate from the much smaller decoded-artwork preload cache.

## CSS output and invalidation scope

The engine writes palette colours, effect controls, four animation durations, and scene/energy/tone classes to two `.luminous-background-effects` buffers only. It does **not** mutate adaptive palette variables/classes on `<html>`.

The inactive buffer receives a fixed profile with transitions disabled during preparation. After two requested frames, `luminous-palette-visible` starts a 700 ms opacity dissolve while the outgoing buffer fades away. Colours and filters are not animated, so large blurred gradients do not need to be rerasterized for every intermediate colour. The old buffer is hidden and cleared at the end, and rapid changes reuse those same two buffers. Scene selection, gradients, blur strengths, and motion paths are unchanged; the colour morph is now a scene dissolve. Motion-duration changes update both prepared scenes during a dissolve.

`clear()` cancels image work and pending dissolve scheduling, fades out the effect buffers, and clears their palette-owned state. Media rendering remains independent, so artwork/video stays visible if analysis is disabled or fails. Runtime destruction cancels the remaining frame/timer even if the background root has already been removed.
