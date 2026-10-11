# UI and Spotify integration

## Settings dialog

`ThemeMenuFeature` waits for `Spicetify.Menu.Item`, registers **Luminous Settings**, and deregisters it on teardown. The modal uses Spotify's React runtime and contains Presets, Appearance, Motion, and Advanced tabs generated from centralized setting metadata.

The dialog provides visual presets, controlled settings, reset, diagnostics, Escape close, focus trapping, tab-list keyboard navigation, and restoration of the previously focused element. Opening Settings adds `luminous-settings-open`, which pauses only Luminous decorative background animation while the user edits controls. Spotify playback and source video elements are not paused.

Range controls keep their displayed value responsive while expensive setting application is coalesced. The modal does not use a fullscreen `backdrop-filter`, and tab switches do not animate measured heights with synchronous layout reads.

## Structural synchronization

`src/ui/domPulse.ts` and `src/ui/mainViewPulse.ts` are the synchronization backbone.

`DomPulse` is the only broad structural observer. It ignores global attribute churn, ignores records already owned by `#main-view`, bounds retained records, and slows dispatch during saturated ad-block mutation storms. `MainViewPulse` is the only child-list observer for `#main-view`; consumers provide selector filters so unrelated ad-block or Spotify insertions do not trigger expensive page queries. Both services disconnect their MutationObservers while the document is hidden, discard queued DOM churn, then reconnect and run one catch-up refresh on return.

`Synchronize` uses those pulses to maintain cheap state classes for CSS:

- playlist/search/episode/artist/home page state;
- left sidebar expansion;
- ad/test-ref containers that need to be hidden;
- artist image ancestors that need transparent backgrounds.

Page detection anchors on stable Spotify hooks: `data-testid="playlist-page"`, `data-testid="playlist-tracklist"`, `data-testid="home-page"`, `data-testid="entity-header"`, `#searchPage`, `section[data-testid="episode"]`, and `section[data-test-uri^="spotify:artist:"]`. Spotify 1.3.x replaced the previous semantic page classes (`playlist-playlist-*`, `main-home-*`, `main-entityHeader-*`, `main-shelf-*`) with per-build hashed CSS-module names, so hashed classes are never used as anchors. Home shortcut and shelf state no longer exist in the new Home/genre UI, and the home header height bridge was removed with it.

This replaces the active broad `:has()` selectors used by Luminous with simple class matching while keeping the same visual rules, including the right-sidebar Canvas marker. The Cinema bridge now tracks `#lyrics-cinema` and its `luminous-cinema-has-video` state; the old cinema branch markers were tied to the removed `.main-actionBar-ActionBarContainer` structure.

Playlist artwork synchronization keeps a single attribute observer only on the current source element (`.before-scroll-node > div > :first-child`, the playlist background-image element) and mirrors its background onto the current `[data-testid="entity-header"]`. The left sidebar expansion state is width-based because the sidebar's collapsed/expanded classes are hashed.

## Canvas UI state

Canvas discovery is structural-event driven and media-event driven. The global observer no longer watches `class`, `style`, `hidden`, or `src` attributes across Spotify. Revisions change only when selected video, mode, source identity, or playable state actually changes.

The right-sidebar Canvas class is tracked directly on `aside#Desktop_PanelContainer_Id` instead of scanning every right sidebar on each update. Long-form protected video remains handled by the direct-video background path documented in `background.md`, hosted by the same panel container because the old `#VideoPlayerNpv_ReactPortal` host no longer exists in Spotify 1.3.x.

## Visibility performance

`VisibilityHoldFeature` toggles `luminous-visibility-hold` from `visibilitychange`. While Spotify is hidden or fully occluded, ambient CSS animation is frozen; the hold is released two rendered frames after the document becomes visible again. Revealing a window first re-presents its last committed frame, and resampling the animations at wall-clock time inside that moment made the ambient scene visibly jump once by the whole hidden duration. Resuming from the frozen pose keeps the reveal seamless. Video playback is likewise untouched; force-pausing captured media can produce a black first frame after Alt+Tab in Chromium/Electron.

## Splash

The splash is driven by shared UI health. It does not own a document-wide MutationObserver. The bootstrap CSS fallback is controlled by `luminous-bootstrap-pending` and is removed after the Spotify shell becomes available.

## Diagnostics

`Diagnostics.get()` returns build/runtime/settings/environment data plus performance counters from both pulse services:

- mutation callback batches received;
- coalesced dispatch frames;
- subscriber dispatch count;
- raw mutation records observed and global records skipped because `MainViewPulse` owns them;
- saturated frames where the bounded mutation-record buffer intentionally stopped retaining individual records;
- rare full-sync frames used as an eventual-consistency catch-up under sustained churn.

These counters make ad-block interaction measurable without telemetry. `Diagnostics.copy()` only writes the report to the clipboard after explicit user action; Luminous sends nothing externally.

## Selector maintenance policy

Spotify DOM is not a stable API. Prefer IDs/portal anchors, narrow observers, and reversible class bridges. Before adding a relational selector or observer, ask whether the same state can be represented by an existing pulse subscription or by a direct media/resize event. Avoid document-wide attribute observation entirely.

## Shell detection

`Synchronize.uiMountWatcher()` gates the dynamic background, splash, and palette on the availability of the Spotify shell. The canonical selector is `.Root__top-container #main-view`, but `Root__top-container` is a Spicetify-aliased class: Spotify rotates the underlying hashed CSS-module name per build, and Spicetify ships the matching alias entry only in a later css-map update (Spotify 1.3.3 + Spicetify 2.45.2 is the most recent example, PR #3996). When the user is on an outdated Spicetify, the canonical selector stops matching even though the React tree is intact.

To survive that window, the watcher now probes a list of stable selectors in priority order, exported as `detectSpotifyShell()`:

1. `.Root__top-container #main-view` — canonical, requires Spicetify css-map alias for the current Spotify build.
2. `.Root__top-container [data-testid="main-view"]` — same parent requirement, alternative stable child hook.
3. `#main-view` — ID set directly in Spotify JSX, immune to hash rotation.
4. `[data-testid="main-view"]` — alternative stable hook for the same element.
5. `.Root__top-container .main-view-container` — Spicetify-aliased class for the inner scroll container.
6. `.main-view-container` — inner container alone, last-resort fallback.

As a defensive belt-and-suspenders for future renames that touch even the ID or `data-testid` hooks, the watcher also arms a one-shot 4-second deadline: if the Spicetify Player has loaded a track but no shell selector has matched yet, `uiHealth` is promoted to `"ready"` so `DynamicBackgroundFeature` can render the artwork immediately instead of stranding the user on a black screen. A `Logger.warn` is emitted so the issue is visible in the console and in any subsequent diagnostics report.

Diagnostics now expose `runtime.shellSelector`, the selector that last matched. `null` means none matched and the Player-based fallback is in effect; the user should be advised to upgrade Spicetify to a version that ships the css-map entry for their Spotify build.
