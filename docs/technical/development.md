# Development, release, and troubleshooting

## Toolchain

The project is TypeScript + Vite. React is a development type dependency only; production uses Spotify's React/ReactDOM runtime. `vite.config.ts` builds the extension and aggregated CSS, and the custom Spicetify sync plugin supports local apply/delete modes.

Important commands:

```bash
npm install
npm run prettier:write
npm run typecheck
npm run build
npm run release
npm run apply
npm run revert
```

`npm run release` rebuilds and recreates `release/`, copies `color.ini`, and synchronizes the version query used by `manifest.json`.

## Expected outputs

A normal Vite build creates:

- `dist/theme.js`
- `dist/user.css`

A release contains:

- `release/theme.js`
- `release/user.css`
- `release/color.ini`

The Marketplace manifest references the release JS/CSS with `?version=<package version>` to invalidate caches.

## Validation order

For source changes:

1. format;
2. `npm run typecheck`;
3. `npm run build`;
4. if release files changed, verify release generation/version URLs;
5. manually test track changes, no-track startup, Canvas appear/disappear, reused Canvas source, settings persistence, reduced motion, hide/show Spotify, settings modal keyboard behavior, and hot reinjection.

For package handoff archives, additionally validate `.packagemanifest.json` and `.packageshift` with `@streetraceing/package` when available. Reserved metadata must not be listed as project payload.

## Runtime debugging

Console messages are grouped by channels: Runtime, Main, Background, Canvas, Palette, Song, Settings, Motion, and UI. Prefer the **Copy diagnostics** action before requesting arbitrary console dumps.

Useful checks:

- `Luminous.Background.getType()` — `none`, `image`, or `canvas`.
- `Luminous.Canvas.get()` — selected Spotify source/mode/revision.
- `Luminous.Song.getSync()` — normalized current track.
- `Luminous.Settings.snapshot()` — effective settings after normalization.
- `Luminous.Diagnostics.toText()` — complete report string.

## Canvas troubleshooting

Artwork fallback is expected when:

- no visible Canvas/NPV/cinema source exists;
- the element has not reached current-data readiness;
- `captureStream()` is missing;
- the stream has no video track yet;
- EME/DRM/security policy blocks capture;
- the clone's `play()` fails.

Do not mark an entire Spotify `<video>` permanently unsupported. Spotify can reuse it with another source. Permanent capture failures are cached per element + source identity.

If a source is temporarily unready, media events increment Canvas revision and let the background retry.

## Blank background troubleshooting

Check in order:

1. `dynamicBackground` is true;
2. Song has an artwork URL;
3. UI health is not stuck in `booting`;
4. source mode is expected (`auto` or `artwork`);
5. Background type in diagnostics;
6. image load/CORS warnings;
7. Canvas warning only if auto video is expected.

The neutral base while Spotify has not supplied metadata is intentional.

## Performance troubleshooting

Start with the **Performance** preset. It changes several independent cost centers at once: disables Canvas observation/capture through artwork-only mode, uses still motion, removes parallax/grain/highlights, and switches to lite effect detail.

If tuning manually, the largest expected reductions are usually:

1. artwork source instead of auto Canvas;
2. lite quality;
3. still movement;
4. parallax off;
5. grain at 0;
6. keep `pauseWhenHidden` enabled.

Avoid permanent `will-change` on static elements. Luminous applies it only under motion selectors.

## Hot-reload/reinjection checklist

A new resource owner must have an explicit cleanup path. This includes:

- Spotify Player listeners;
- DOM/media listeners;
- MutationObservers;
- matchMedia listeners;
- window/document listeners;
- requestAnimationFrame IDs;
- timers;
- React roots;
- MediaStreams/tracks;
- root classes and inline CSS variables.

The top-level `destroy()` path should remain safe to call more than once.

## Compatibility philosophy

Spotify DOM is an unstable dependency. Prefer graceful degradation to version-specific hard failure. Keep source modules small enough that a selector change in synchronization, a Canvas change, or a palette issue can be fixed independently.

Native APIs are optional. If `Spicetify.Platform` or a native bridge is missing/changed, wrappers should return failure and log rather than assume availability.
