# Troubleshooting

## The theme does not appear after applying

1. Confirm that Spicetify works with the installed Spotify desktop version.
2. Run `npm run typecheck` and `npm run build` from the project root.
3. Confirm that `dist/theme.js` and `dist/user.css` exist.
4. Run `npm run apply`, then restart Spotify completely if needed.
5. Check the developer console for messages prefixed with `Luminous`.

## The background is blank

Luminous shows a neutral base until Spotify supplies track artwork. Start playback and wait for metadata to load. Also confirm that **Dynamic background** is enabled in **Luminous Settings**.

## Adaptive effects are missing or too subtle

Confirm that **Adaptive effects** is enabled and **Effect intensity** is above `0%`. Nearly monochrome covers intentionally use the restrained Halo scene. The cover or video remains visible when colour extraction fails.

## Canvas does not play in the background

Canvas and long-form NPV support require Spotify to expose a playable video and Chromium to support `captureStream()`. Luminous keeps the current cover visible while a source is not ready and retries after media readiness changes.

Protected EME/DRM video cannot be captured. Unsupported or security-restricted sources use artwork without repeated capture attempts. A warning is useful when reporting a real playback failure; an ordinary artwork fallback alone is not an error.

## Settings do not persist

Settings are stored in Spicetify local storage under `luminous-settings`. Check whether another modification clears local storage. Luminous batches slider writes and flushes pending changes during a normal page close.

## The interface looks incorrect after a Spotify update

Spotify can change its DOM without notice. Update Spicetify and Luminous, then run:

```bash
npm install
npm run typecheck
npm run build
npm run apply
```

If the problem remains, include Spotify, Spicetify, and Luminous versions together with the operating system, a screenshot, and relevant console messages.

## Return to the Marketplace theme

```bash
npm run revert
```

This selects the configured `marketplace` theme, reapplies Spicetify, and removes the locally synchronised Luminous build.
