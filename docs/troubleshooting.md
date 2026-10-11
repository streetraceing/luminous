# Troubleshooting

For users: open **Luminous Settings → Advanced → Copy diagnostics** and include the copied report with the problem description.

For maintainers, build failures, Canvas fallbacks, Spotify DOM compatibility, and runtime diagnosis are documented in [technical development and troubleshooting](./technical/development.md).

## Black / empty background after a Spotify update

Symptom: the entire background is black or flat-coloured even though the player is playing a track, the splash never hands off to the dynamic scene, and **Luminous Settings → Advanced → Copy diagnostics** shows `"uiHealth": "booting"` and `"background": "none"`.

Cause: Spotify 1.3.3 (Oct 2026) rotated the hashed CSS-module class that Spicetify aliases to `Root__top-container`. Spicetify shipped the new css-map entry only in **v2.45.2** (PR #3996). On older Spicetify the canonical `.Root__top-container #main-view` shell selector stops matching, `uiHealth` stays on `"booting"`, and `DynamicBackgroundFeature` destroys the background on every frame.

Two fixes, in order:

1. **Upgrade Spicetify to 2.45.2 or later.** This is the real fix — it restores the alias so the canonical selector matches again. Run `spicetify upgrade` (or reinstall) and then `spicetify apply`.
2. **Update Luminous.** `uiMountWatcher` no longer depends solely on `.Root__top-container #main-view`. It falls back through `#main-view`, `[data-testid="main-view"]`, and `.main-view-container` (all set directly in Spotify JSX, immune to hash rotation), and additionally promotes `uiHealth` to `"ready"` once the Spicetify Player has loaded a track even if no shell selector matches. The dynamic background therefore renders even on an outdated Spicetify, though upgrading Spicetify is still recommended so the rest of the theme keeps its visual hooks.

The diagnostics field `runtime.shellSelector` shows which selector the watcher matched. `null` means none matched and the Player-based fallback is in effect.
