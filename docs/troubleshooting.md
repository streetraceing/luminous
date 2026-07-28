# Troubleshooting

## The theme does not appear after applying

1. Confirm that Spicetify itself works with your installed Spotify desktop version.
2. From the project root, run `npm run build` and confirm that `dist/theme.js` and `dist/user.css` are created.
3. Run `npm run apply`, then restart Spotify completely if the UI remains unchanged.
4. Open the developer console and look for messages prefixed with `Luminous`.

## The background is blank

Luminous shows a neutral base layer when Spotify has not supplied artwork yet. Start playback and wait for the track metadata to load.

If the **Dynamic background** setting is off, this is expected. Re-enable it through the brightness icon in the top bar.

## Canvas does not play in the background

Canvas support depends on Spotify exposing a playable video and the browser runtime supporting `captureStream()`. Luminous automatically falls back to the current track's cover art when either condition is unavailable. This fallback does not indicate an error.

## Settings do not persist

The settings are stored in Spicetify local storage. Check whether another Spotify modification clears local storage, then change a setting and allow a moment for it to save before force-quitting the app. Normal page close and restart writes any pending change automatically.

## The interface looks incorrect after a Spotify update

Spotify can change its DOM structure without notice. First update Spicetify and Luminous to the latest compatible versions, then rebuild and apply the theme again:

```bash
npm install
npm run build
npm run apply
```

If the problem persists, include the Spotify version, Spicetify version, operating system, a screenshot, and relevant `Luminous` console messages when opening an issue.

## Return to the Marketplace theme

```bash
npm run revert
```

This project's script selects the `marketplace` theme, reapplies Spicetify, and removes the locally synchronised Luminous build.
