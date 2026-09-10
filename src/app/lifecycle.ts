import { DomPulse } from '../ui/domPulse';
import { MainViewPulse } from '../ui/mainViewPulse';
import { unmountLuminousApp } from './runtime';

const ROOT_CLASSES = [
  'luminous-runtime-active',
  'luminous-bootstrap-pending',
  'hideDynamicBackground',
  'luminous-dynamic-palette',
  'luminous-palette-transitioning',
  'luminous-track-changing',
  'luminous-glass-highlights',
  'luminous-reduce-motion',
  'luminous-runtime-suspended',
  'luminous-settings-open',
  'luminous-document-hidden',
  'luminous-visibility-hold',
  'luminous-parallax-enabled',
  'luminous-source-auto',
  'luminous-source-artwork',
  'luminous-motion-still',
  'luminous-motion-drift',
  'luminous-motion-float',
  'luminous-motion-orbit',
  'luminous-quality-full',
  'luminous-quality-balanced',
  'luminous-quality-lite',
  'luminous-effect-aurora',
  'luminous-effect-ember',
  'luminous-effect-bloom',
  'luminous-effect-prism',
  'luminous-effect-halo',
  'luminous-effect-nebula',
  'luminous-effect-energy-soft',
  'luminous-effect-energy-flow',
  'luminous-effect-energy-vivid',
  'luminous-effect-tone-dark',
  'luminous-effect-tone-balanced',
  'luminous-effect-tone-light',
] as const;

const ROOT_VARIABLES = [
  '--luminous-background',
  '--luminous-background-blur',
  '--luminous-background-brightness',
  '--luminous-ui-opacity',
  '--luminous-ui-blur',
  '--luminous-ui-base',
  '--luminous-palette-effect-opacity',
  '--luminous-motion-duration',
  '--luminous-transition-duration',
  '--luminous-vignette-opacity',
  '--luminous-grain-opacity',
  '--luminous-parallax-strength',
  '--luminous-parallax-x',
  '--luminous-parallax-y',
] as const;

let destroyed = false;

export function destroyLuminousRuntime(): void {
  if (destroyed) return;
  destroyed = true;

  unmountLuminousApp();
  Luminous.Background.destroy();
  Luminous.Palette.clear();
  Luminous.Canvas.destroy();
  Luminous.Song.destroy();
  Luminous.Settings.destroy();
  MainViewPulse.destroy();
  DomPulse.destroy();

  const root = document.documentElement;
  ROOT_CLASSES.forEach((className) => root.classList.remove(className));
  ROOT_VARIABLES.forEach((variable) => root.style.removeProperty(variable));

  Luminous.Logger.info('Runtime', 'Destroyed');
}

export function markLuminousRuntimeActive(): void {
  destroyed = false;
  document.documentElement.classList.add(
    'luminous-runtime-active',
    'luminous-bootstrap-pending',
  );
}
