import { DynamicBackgroundFeature } from "./features/DynamicBackgroundFeature";
import { ThemeMenuFeature } from "./features/ThemeMenuFeature";
import { SynchronizeFeature } from "./features/SynchronizeFeature";

export function App() {
  const { React } = Spicetify;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(SynchronizeFeature),
    React.createElement(DynamicBackgroundFeature),
    React.createElement(ThemeMenuFeature),
  );
}
