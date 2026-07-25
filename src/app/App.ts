import { DynamicBackgroundFeature } from './features/DynamicBackgroundFeature';
import { SplashFeature } from './features/SplashFeature';
import { ThemeMenuFeature } from './features/ThemeMenuFeature';
import { SynchronizeFeature } from './features/SynchronizeFeature';
import { getReact } from './react';

export function App() {
  const React = getReact();

  return React.createElement(
    React.Fragment,
    null,
    // React.createElement(SplashFeature),
    React.createElement(SynchronizeFeature),
    React.createElement(DynamicBackgroundFeature),
    React.createElement(ThemeMenuFeature),
  );
}
