# Runtime architecture

## Execution model

`src/index.ts` is the only runtime entry point. Vite injects all CSS through `import.meta.glob('./styles/**/*.css', { eager: true })`; JavaScript is built as one Spicetify extension and runs in Spotify's page context.

The boot order is deliberate:

1. `destroyExistingRuntime()` calls the previous `window.Luminous.destroy()` when a local rebuild is injected over an existing runtime.
2. `exposeGlobalAPI()` publishes the new API classes and the new teardown callback.
3. `markLuminousRuntimeActive()` resets the lifecycle guard.
4. The logger prints build metadata.
5. `registerLuminousSettings()` registers the complete declarative setting schema.
6. `Settings.init()` restores, normalizes, applies, and persists settings. Applying `backgroundSource` can disable Canvas observation immediately.
7. `Song.init()` starts asynchronously. Failure is logged without preventing the UI shell from mounting.
8. `mountLuminousApp()` waits for Spotify's React/ReactDOM runtime and mounts feature components into a private root.

The application has no own playback state machine. It derives state from Spotify and mirrors only what is required to render the theme.

## Global API

`window.Luminous` exposes:

- `Logger` — structured console logging and build banner.
- `Native` — defensive wrappers for optional platform/native operations.
- `Settings` — schema-backed persistent settings.
- `Song` — normalized current-track events and readiness.
- `Canvas` — discovery of visible Spotify video candidates.
- `Palette` — cover analysis and adaptive scene CSS.
- `Background` — background DOM, image/video buffering, capture, transition, and cleanup.
- `Diagnostics` — serializable runtime/settings/environment state.
- `destroy()` — idempotent runtime teardown.

The global is both a debugging surface and the dependency bridge between small modules. It must remain replaceable because local Vite/Spicetify sync can execute a new bundle without a full Spotify process restart.

## React feature shell

`src/app/App.ts` composes feature-only components; they render little or no persistent UI except the settings modal/splash:

- `SynchronizeFeature` starts Spotify shell synchronization.
- `MotionFeature` owns reduced-motion, pointer parallax, and document visibility suspension.
- `DynamicBackgroundFeature` joins Song, Canvas, settings, UI health, Palette, and Background.
- `SplashFeature` manages the short startup overlay.
- `ThemeMenuFeature` registers the menu item and settings dialog.

The project uses wrappers in `src/app/react.ts` instead of importing React directly. Production must use the exact React instance hosted by Spotify to avoid duplicate-runtime hooks errors.

## Track state

`Song` waits until `Spicetify.Player` has the methods required by the theme. It registers one stable `songchange` callback, emits `ready` once meaningful metadata exists, and emits `change` when the normalized track identity changes.

Track data is normalized to the small `SongPayload` consumed by visuals. The class owns the Player listener and initial metadata timer and removes both in `destroy()`. A resettable readiness promise prevents a replaced runtime from inheriting stale resolution state.

## Canvas state

`Canvas` never captures video itself. It only finds the best visible source element and emits `{video, mode, source, revision}`.

Candidate priority is:

1. `.canvasVideoContainerNPV video`
2. `#VideoPlayerNpv_ReactPortal video`
3. cinema video under `.Root__top-container:has(#VideoPlayerCinema_ReactPortal)`

Within a candidate selector, visible non-ended video with current data is preferred. Visibility checks require connection, non-hidden display/visibility, non-zero opacity, and layout rectangles.

A document `MutationObserver` watches structural and relevant attribute changes. Checks are coalesced into one `requestAnimationFrame`. The selected video is additionally observed through media readiness/source events. `revision` increments for meaningful source/readiness transitions, allowing consumers to retry even when Spotify reuses the same `<video>` element.

`setEnabled(false)` fully disconnects observation and source listeners. Artwork-only/performance modes therefore avoid paying ongoing Canvas DOM-observation cost.

## Dynamic background orchestration

`DynamicBackgroundFeature` is the coordinator, not the renderer. It maintains React state for current song, Canvas payload, dynamic-background toggle, palette toggle, background source, and Spotify UI health.

Behavior:

- UI still booting → no active background work.
- Dynamic background disabled → clear media layer.
- Palette disabled → clear generated palette classes/variables but keep media.
- Source `auto` + playable Canvas candidate → request Canvas rendering with artwork fallback.
- Otherwise → render artwork.
- No media → neutral base.

Every song change cancels older palette work and preloads the new cover. Event listeners and setting subscriptions are explicitly removed by effect cleanup.

## Lifecycle and hot replacement

`src/app/lifecycle.ts` is the final ownership boundary. Teardown order is:

1. unmount React, letting feature effects unsubscribe;
2. destroy Background and captured streams;
3. clear Palette;
4. destroy Canvas observers/media listeners;
5. destroy Song player listener/timers;
6. flush and destroy Settings;
7. remove Luminous-owned root classes and CSS variables.

`destroyed` makes the operation idempotent. `src/app/runtime.ts` also uses a mount revision token: an asynchronous wait for React cannot mount an obsolete runtime after teardown.

This fixes a critical class of local-development bugs where a previous injection kept Player listeners, MutationObservers, or React effects alive and caused duplicate reactions after every rebuild.

## Error containment

External integration failures are intentionally localized:

- listener callbacks run behind try/catch and are logged by channel;
- missing native APIs return a failure boolean rather than throwing into the theme;
- Canvas capture failure falls back to artwork;
- palette extraction failure clears only adaptive effects;
- settings parse/normalization failure falls back to registered defaults;
- UI synchronization is health-scored instead of assuming selectors always exist.

A visual feature should degrade independently rather than make Spotify unusable.
