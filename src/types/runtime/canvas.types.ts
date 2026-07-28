export type CanvasEvent = 'mount' | 'unmount' | 'change';

export type CanvasPayload = {
  video: HTMLVideoElement | null;
  mode: CanvasMode;
  source: string | null;
  revision: number;
};

export type CanvasListener = (payload: CanvasPayload) => void;

export type CanvasMode = 'npv' | 'npv-video' | 'cinema' | null;
