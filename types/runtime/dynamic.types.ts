export type PlaylistBackgroundSyncOptions = {
  onBackgroundChange?: (
    bg: string,
    source: HTMLElement,
    target: HTMLElement,
  ) => void;
};

export type SyncController = {
  disconnect(): void;
};

export type HomeHeaderHeightSyncOptions = {
  onHeightChange?: (
    height: number,
    chips: HTMLElement,
    firstSection: HTMLElement,
    header: HTMLElement,
  ) => void;
};
