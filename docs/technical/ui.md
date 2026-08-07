# UI, motion, and Spotify integration

## Settings dialog

`ThemeMenuFeature` waits for `Spicetify.Menu.Item`, registers **Luminous Settings**, and deregisters it on teardown. Opening the item mounts the modal through Spotify's React runtime.

The dialog contains Presets, Appearance, Motion, and Advanced tabs generated from centralized setting metadata. It provides:

- visual preset buttons;
- controlled toggle/range/choice fields backed by `Settings.subscribe()`;
- reset of all user-visible settings;
- runtime summary;
- copyable diagnostics;
- Escape close;
- focus trapping;
- restoration of the previously focused element;
- keyboard tab-list navigation.

The modal changes `body.style.overflow` only while open and restores the exact previous value.

## Motion controller

`MotionFeature` owns cross-cutting motion state rather than scattering event listeners through renderers.

Reduced motion is true when the explicit setting is on, or when `respectSystemMotion` is enabled and `matchMedia('(prefers-reduced-motion: reduce)')` matches. The resulting root class lets CSS stop custom transitions/animations globally.

Pointer parallax maps viewport pointer coordinates to -1…1 targets and approaches them in requestAnimationFrame using smoothing factor 0.12. Tiny values snap to zero. CSS receives pixel offsets; pointer leave smoothly returns to center. No frame loop runs while the target is settled.

Visibility handling sets `luminous-runtime-suspended` to pause Luminous-owned decorative CSS when the Spotify document is hidden. Canvas clones are intentionally left under the browser's media throttling instead of being force-paused/restarted, avoiding black first-frame artifacts after Alt+Tab.

## UI synchronization

`src/ui/synchronize.ts` handles Spotify surfaces that are not stable public APIs. It uses MutationObservers plus requestAnimationFrame scheduling rather than performing expensive layout work on every raw mutation.

Responsibilities include synchronizing playlist header artwork, Home header sizing, and shell health. `SynchronizeFeature` manages the aggregate subscription; `src/ui/health.ts` reports whether expected shell regions are booting, healthy, or degraded. Luminous deliberately does not rewrite Spotify's generic `data-transition` state: that attribute is transient and can also be used outside Cinema, so styling or deleting it can create one-frame UI disappearance during track changes. A missing `#main-view` must persist for 500 ms before health is downgraded to `booting`, filtering single-commit React detach/reattach cycles. Synchronizers also retain the last valid decoration while a still-connected target temporarily loses nested React children, avoiding remove/re-add flashes during Spotify commits.

Cinema-only CSS hiding is gated by the actual `#VideoPlayerCinema_ReactPortal`, not transition attributes alone. This prevents transient `data-cinema-npv-*` flags from hiding global navigation or sidebars during an ordinary song/Canvas update. The startup splash fallback is similarly gated by `luminous-runtime-active`; once the JavaScript runtime is alive, a temporary Spotify shell remount can never reactivate the fullscreen bootstrap overlay. The splash also disconnects its document-wide observer and health subscription after its first completed startup run.

`DynamicBackgroundFeature` waits until health leaves `booting` before activating media work. Degraded does not mean disabled: Spotify selectors can partially change while enough of the shell still exists for the theme to remain useful.

## Splash

`SplashFeature` watches for the Spotify shell and keeps its observer/frame/timer ownership local to its React effect. All handles are cancelled on unmount so hot replacement cannot accumulate startup watchers.

## Selector maintenance policy

Spotify may rename class names, portals, or shell structure without notice. When a selector breaks:

1. confirm whether it is a visual enhancement or a required integration;
2. prefer stable IDs/portal anchors when available;
3. scope selectors narrowly enough not to match unrelated `<video>` or panels;
4. preserve a fallback path;
5. coalesce MutationObserver work through animation frames;
6. add teardown before adding new observers/listeners;
7. update diagnostics/health reporting if the selector represents an important shell boundary.

Do not use broad DOM rewrites to force Spotify into the desired shape; overrides should be reversible and survive missing elements.

## Diagnostics

`Diagnostics.get()` returns a plain serializable object with build version/time, background type, Canvas mode/source, normalized track snapshot, UI health, visibility, all registered settings, and basic platform/language information.

`Diagnostics.copy()` writes pretty JSON only after explicit user action. This makes reports reproducible without keeping a hidden telemetry channel; Luminous itself sends no diagnostics anywhere.
