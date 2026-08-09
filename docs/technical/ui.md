# UI and Spotify integration

## Settings dialog

`ThemeMenuFeature` waits for `Spicetify.Menu.Item`, registers **Luminous Settings**, and deregisters it on teardown. The modal uses Spotify's React runtime and contains Presets, Appearance, Motion, and Advanced tabs generated from centralized setting metadata.

The dialog provides visual presets, controlled settings, reset, diagnostics, Escape close, focus trapping, tab-list keyboard navigation, and restoration of the previously focused element. Opening Settings adds `luminous-settings-open`, which pauses only Luminous decorative background animation while the user edits controls. Spotify playback and source video elements are not paused.

Range controls keep their displayed value responsive while expensive setting application is coalesced. The modal does not use a fullscreen `backdrop-filter`, and tab switches do not animate measured heights with synchronous layout reads.

## Structural synchronization

`src/ui/domPulse.ts` and `src/ui/mainViewPulse.ts` are the synchronization backbone.

`DomPulse` is the only broad structural observer. It ignores global attribute churn, ignores records already owned by `#main-view`, bounds retained records, and slows dispatch during saturated ad-block mutation storms. `MainViewPulse` is the only child-list observer for `#main-view`; consumers provide selector filters so unrelated ad-block or Spotify insertions do not trigger expensive page queries. Both services disconnect their MutationObservers while the document is hidden, discard queued DOM churn, then reconnect and run one catch-up refresh on return.

`Synchronize` uses those pulses to maintain cheap state classes for CSS:

- playlist/search/episode/artist/home/shelf page state;
- Home shortcut state;
- left sidebar expansion;
- the direct parent used by Spotify action-bar backgrounds;
- ad/test-ref containers that need to be hidden;
- artist image ancestors that need transparent backgrounds.

This replaces the active broad `:has()` selectors used by Luminous with simple class matching while keeping the same visual rules, including right-sidebar Canvas and Cinema branch markers.

Playlist artwork synchronization keeps a single attribute observer only on the current source element. Home header sizing uses `ResizeObserver` only on the filter chips and first Home section instead of observing class/style changes over the entire main view.

## Canvas UI state

Canvas discovery is structural-event driven and media-event driven. The global observer no longer watches `class`, `style`, `hidden`, or `src` attributes across Spotify. Revisions change only when selected video, mode, source identity, or playable state actually changes.

The right-sidebar Canvas class is tracked directly instead of scanning every right sidebar on each update. Long-form protected video remains handled by the direct-video background path documented in `background.md`.

## Visibility performance

`PerformanceFeature` toggles `luminous-document-hidden` from `visibilitychange`. CSS pauses Luminous-owned media transforms and adaptive-effect animations while the document is hidden. Video playback itself is intentionally untouched; force-pausing captured media can produce a black first frame after Alt+Tab in Chromium/Electron.

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
