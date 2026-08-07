# Runtime architecture

## Execution model

`src/index.ts` is the runtime entry point. Vite bundles TypeScript and eagerly includes every CSS file under `src/styles`.

Boot order:

1. destroy an already injected Luminous runtime if present;
2. expose the new `window.Luminous` API;
3. mark the runtime active;
4. register and initialize settings;
5. start `Song.init()`;
6. mount the React feature shell using Spotify's own React/ReactDOM instances.

## Feature shell

`App` contains:

- `SplashFeature` — startup status overlay using the original stable shell-health behavior;
- `SynchronizeFeature` — observes Spotify structural UI state;
- `DynamicBackgroundFeature` — the pre-refactor coordinator joining Song, Canvas, Palette, Background, and UI health;
- `ThemeMenuFeature` — settings menu/modal.

The previous always-running `MotionFeature` is no longer mounted. System reduced-motion is handled by CSS; the explicit Reduce motion setting toggles the same stable root class directly.

## Stable visual baseline

The following files are deliberately restored byte-for-byte from the pre-refactor project baseline in 2.2.1:

- `src/render/background.ts`
- `src/api/palette.ts`
- `src/app/features/DynamicBackgroundFeature.ts`
- `src/app/features/SplashFeature.ts`
- `src/app/features/SynchronizeFeature.ts`
- `src/ui/health.ts`
- `src/ui/synchronize.ts`
- `src/styles/luminous.css`
- `src/styles/components/splash.css`
- all Spotify shell override CSS files under `src/styles/overrides/`

This is intentional regression control, not accidental code loss. New settings/lifecycle/menu/documentation work is kept around this stable rendering core.

## Canvas API

Canvas discovery also returns to the original selector/event strategy. Two lifecycle additions are retained around it:

- `setEnabled(false)` disconnects observation for artwork-only mode;
- `destroy()` disconnects observers/media listeners and clears runtime state during hot replacement.

Those additions do not change how a playable Canvas candidate is selected while Canvas is enabled.

## Hot replacement

The newer lifecycle boundary is retained because it fixes duplicate listeners/observers during development without participating in track rendering. `window.Luminous.destroy()` unmounts React, destroys Background/Canvas/Song, clears Palette, flushes Settings, and removes owned root state before a new bundle is injected.

## Stability policy

Rendering behavior should now be compared against the pre-refactor baseline before accepting future visual features. New fullscreen filters, blend layers, root transforms, global opacity/visibility rules, and media lifecycle state machines must be considered high-risk because they interact directly with Spotify/Electron compositing during track changes.
