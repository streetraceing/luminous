type VersionInfo = {
  containerVersion: string;
  containerBuildType: string;
  containerPlatform: string;
  uiVersion: string;
  cefVersion: string;
  cefRuntime?: string;
};

type ToastPayload = {
  title: string;
  body: string;
};

export class Native {
  static isDesktop(): boolean {
    return !!Spicetify.Platform?.NativeAPI;
  }

  static canFocus(): boolean {
    return (
      Spicetify.Platform?.FocusMainWindowAPI?.canFocusMainWindow?.() ?? false
    );
  }

  static focus(): void {
    if (!this.canFocus()) return;
    Spicetify.Platform.FocusMainWindowAPI.focusMainWindow();
  }

  static getZoomCapabilities() {
    return (
      Spicetify.Platform?.ZoomAPI?.getCapabilities?.() ?? {
        canGetZoomLevel: false,
        canSetZoomLevel: false,
        canZoomIn: false,
        canZoomOut: false,
      }
    );
  }

  static async getZoomLevel(): Promise<number | null> {
    try {
      return await Spicetify.Platform.ZoomAPI.getZoomLevel();
    } catch {
      return null;
    }
  }

  static async setZoomLevel(level: number) {
    const caps = this.getZoomCapabilities();
    if (!caps.canSetZoomLevel) return;

    await Spicetify.Platform.ZoomAPI.setZoomLevel(level);
  }

  static zoomIn() {
    if (!this.getZoomCapabilities().canZoomIn) return;
    Spicetify.Platform.ZoomAPI.zoomIn();
  }

  static zoomOut() {
    if (!this.getZoomCapabilities().canZoomOut) return;
    Spicetify.Platform.ZoomAPI.zoomOut();
  }

  static setWindowButtonsVisible(visible: boolean) {
    Spicetify.Platform?.NativeAPI?.setWindowButtonsVisibility?.(visible);
  }

  static setFullscreen(fullscreen: boolean) {
    if (fullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  static restart() {
    Spicetify.Platform?.LifecycleAPI?.restart?.();
  }

  static shutdown() {
    Spicetify.Platform?.LifecycleAPI?.shutdown?.();
  }

  static openNotificationSettings() {
    Spicetify.Platform?.OSNotificationsAPI?.openNotificationsSetting?.();
  }

  static showToast(payload: ToastPayload, callback?: () => void) {
    Spicetify.Platform?.OSNotificationsAPI?.showToast?.(payload, callback);
  }

  static async getLogFolder(): Promise<string | null> {
    try {
      return await Spicetify.Platform.DesktopLogsAPI.getLogFolder();
    } catch {
      return null;
    }
  }

  static async getVersionInfo(): Promise<VersionInfo | null> {
    try {
      return await Spicetify.Platform.UpdateAPI.getVersionInfo();
    } catch {
      return null;
    }
  }
}
