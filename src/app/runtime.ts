import { App } from "./App";
import { getReact } from "./react";

const ROOT_ID = "luminous-react-root";
const REACT_READY_TIMEOUT = 15000;

let root: { render: (element: unknown) => void; unmount?: () => void } | null =
  null;

export function mountLuminousApp() {
  waitForReactRuntime()
    .then(renderApp)
    .catch((error) => {
      Luminous.Logger.error("Main", error);
    });
}

function renderApp() {
  const React = getReact();
  const { ReactDOM } = Spicetify;
  const container = ensureRoot();
  const element = React.createElement(App);

  if (ReactDOM.createRoot) {
    const mountedRoot = root ?? ReactDOM.createRoot(container);
    root = mountedRoot;
    mountedRoot.render(element);
    return;
  }

  ReactDOM.render(element, container);
}

function waitForReactRuntime(): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      if (Spicetify.React && Spicetify.ReactDOM) {
        resolve();
        return;
      }

      if (Date.now() - start > REACT_READY_TIMEOUT) {
        reject(new Error("Spicetify React runtime not available"));
        return;
      }

      requestAnimationFrame(check);
    };

    check();
  });
}

export function unmountLuminousApp() {
  if (root?.unmount) {
    root.unmount();
    root = null;
    return;
  }

  const { ReactDOM } = Spicetify;
  const container = document.getElementById(ROOT_ID);
  if (container && ReactDOM.unmountComponentAtNode) {
    ReactDOM.unmountComponentAtNode(container);
  }
}

function ensureRoot(): HTMLDivElement {
  let container = document.getElementById(ROOT_ID) as HTMLDivElement | null;

  if (!container) {
    container = document.createElement("div");
    container.id = ROOT_ID;
    container.style.display = "contents";
    document.body.appendChild(container);
  }

  return container;
}
