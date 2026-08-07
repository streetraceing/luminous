import { Logger } from '../api/logger';

export type UiHealthStatus = 'booting' | 'ready' | 'waiting';

export type UiHealthState = Readonly<{
  status: UiHealthStatus;
  brokenSince: number | null;
}>;

type UiHealthListener = (state: UiHealthState) => void;

let state: UiHealthState = {
  status: 'booting',
  brokenSince: null,
};

const listeners = new Set<UiHealthListener>();

export function getUiHealth(): UiHealthState {
  return state;
}

export function setUiHealth(nextState: Partial<UiHealthState>): void {
  const next: UiHealthState = { ...state, ...nextState };

  if (next.status === state.status && next.brokenSince === state.brokenSince) {
    return;
  }

  state = next;
  listeners.forEach((listener) => notifyListener(listener));
}

export function subscribeUiHealth(listener: UiHealthListener): () => void {
  listeners.add(listener);
  notifyListener(listener);

  return () => {
    listeners.delete(listener);
  };
}

function notifyListener(listener: UiHealthListener): void {
  try {
    listener(state);
  } catch (error) {
    Logger.error('UI', 'UI health listener failed', error);
  }
}
