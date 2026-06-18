export type CanvasEvent = "mount" | "unmount" | "change";

export type CanvasPayload = {
  video: HTMLVideoElement | null;
  mode: CanvasMode;
};

export type CanvasListener = (payload: CanvasPayload) => void;

export type CanvasMode = "npv" | "cinema" | null;
