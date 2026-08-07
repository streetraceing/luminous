import { App } from './App';
import { getReact } from './react';

const ROOT_ID = 'luminous-react-root';
const REACT_READY_TIMEOUT = 15000;

let root: { render: (element: unknown) => void; unmount?: () => void } | null =
  null;
let mountRevision = 0;
let reactWaitFrame: number | null = null;

export function mountLuminousApp(): void {
  const revision = ++mountRevision;
  cancelReactWait();

  waitForReactRuntime(revision)
    .then(() => {
      if (revision !== mountRevision) return;
      renderApp();
    })
    .catch((error) => {
      if (revision !== mountRevision) return;
      Luminous.Logger.error('Runtime', 'Failed to mount application', error);
    });
}

export function unmountLuminousApp(): void {
  mountRevision++;
  cancelReactWait();

  if (root?.unmount) {
    root.unmount();
    root = null;
  } else if (typeof Spicetify !== 'undefined' && Spicetify.ReactDOM) {
    const container = document.getElementById(ROOT_ID);
    if (container && Spicetify.ReactDOM.unmountComponentAtNode) {
      Spicetify.ReactDOM.unmountComponentAtNode(container);
    }
  }

  document.getElementById(ROOT_ID)?.remove();
}

function renderApp(): void {
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

function waitForReactRuntime(revision: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = performance.now();

    const check = () => {
      reactWaitFrame = null;
      if (revision !== mountRevision) {
        reject(new Error('Luminous mount superseded'));
        return;
      }

      if (
        typeof Spicetify !== 'undefined' &&
        Spicetify.React &&
        Spicetify.ReactDOM &&
        document.body
      ) {
        resolve();
        return;
      }

      if (performance.now() - start > REACT_READY_TIMEOUT) {
        reject(new Error('Spicetify React runtime not available'));
        return;
      }

      reactWaitFrame = requestAnimationFrame(check);
    };

    check();
  });
}

function cancelReactWait(): void {
  if (reactWaitFrame === null) return;
  cancelAnimationFrame(reactWaitFrame);
  reactWaitFrame = null;
}

function ensureRoot(): HTMLDivElement {
  let container = document.getElementById(ROOT_ID) as HTMLDivElement | null;

  if (!container) {
    container = document.createElement('div');
    container.id = ROOT_ID;
    container.style.display = 'contents';
    document.body.appendChild(container);
  }

  return container;
}
