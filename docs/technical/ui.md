# UI, motion, and Spotify integration

## Settings dialog

`ThemeMenuFeature` waits for `Spicetify.Menu.Item`, registers **Luminous Settings**, and deregisters it on teardown. Opening the item mounts the modal through Spotify's React runtime.

The dialog contains Appearance, Motion, and Advanced tabs generated from centralized setting metadata. It provides:

- visual preset buttons;
- controlled toggle/range/choice fields backed by `Settings.subscribe()`;
- reset of all user-visible settings;
- runtime summary;
- copyable diagnostics;
- animated panel-height transitions;
- Escape close;
- focus trapping;
- restoration of the previously focused element;
- keyboard tab-list navigation.

The modal changes `body.style.overflow` only while open and restores the exact previous value.

## Motion controller

`MotionFeature` owns cross-cutting motion state rather than scattering event listeners through renderers.

Reduced motion is true when the explicit setting is on, or when `respectSystemMotion` is enabled and `matchMedia('(prefers-reduced-motion: reduce)')` matches. The resulting root class lets CSS stop custom transitions/animations globally.

Pointer parallax maps viewport pointer coordinates to -1…1 targets and approaches them in requestAnimationFrame using smoothing factor 0.12. Tiny values snap to zero. CSS receives pixel offsets; pointer leave smoothly returns to center. No frame loop runs while the target is settled.

Visibility handling sets `luminous-runtime-suspended` and delegates media suspension to Background. This avoids running decorative CSS and cloned Canvas playback when the Spotify document is hidden.

## UI synchronization

`src/ui/synchronize.ts` handles Spotify surfaces that are not stable public APIs. It uses MutationObservers plus requestAnimationFrame scheduling rather than performing expensive layout work on every raw mutation.

Responsibilities include synchronizing main-view/sidebar/cinema states and cleaning Spotify-controlled attributes that conflict with theme layout. `SynchronizeFeature` manages the aggregate subscription; `src/ui/health.ts` reports whether expected shell regions are booting, healthy, or degraded.

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
