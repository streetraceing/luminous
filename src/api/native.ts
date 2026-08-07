import { ToastPayload, VersionInfo } from '../types/runtime/native.types';

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
    Spicetify.Platform?.FocusMainWindowAPI?.focusMainWindow?.();
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
    const zoomApi = Spicetify.Platform?.ZoomAPI;
    if (!zoomApi?.getZoomLevel) return null;

    try {
      return await zoomApi.getZoomLevel();
    } catch (error) {
      Luminous.Logger.warn('Runtime', 'Failed to read Spotify zoom', error);
      return null;
    }
  }

  static async setZoomLevel(level: number): Promise<boolean> {
    const zoomApi = Spicetify.Platform?.ZoomAPI;
    if (!zoomApi?.setZoomLevel || !this.getZoomCapabilities().canSetZoomLevel) {
      return false;
    }

    try {
      await zoomApi.setZoomLevel(level);
      return true;
    } catch (error) {
      Luminous.Logger.warn('Runtime', 'Failed to set Spotify zoom', error);
      return false;
    }
  }

  static zoomIn(): void {
    if (!this.getZoomCapabilities().canZoomIn) return;
    Spicetify.Platform?.ZoomAPI?.zoomIn?.();
  }

  static zoomOut(): void {
    if (!this.getZoomCapabilities().canZoomOut) return;
    Spicetify.Platform?.ZoomAPI?.zoomOut?.();
  }

  static setWindowButtonsVisible(visible: boolean): void {
    Spicetify.Platform?.NativeAPI?.setWindowButtonsVisibility?.(visible);
  }

  static async setFullscreen(fullscreen: boolean): Promise<boolean> {
    try {
      if (fullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      return true;
    } catch (error) {
      Luminous.Logger.warn(
        'Runtime',
        'Failed to change fullscreen state',
        error,
      );
      return false;
    }
  }

  static restart(): void {
    Spicetify.Platform?.LifecycleAPI?.restart?.();
  }

  static shutdown(): void {
    Spicetify.Platform?.LifecycleAPI?.shutdown?.();
  }

  static openNotificationSettings(): void {
    Spicetify.Platform?.OSNotificationsAPI?.openNotificationsSetting?.();
  }

  static showToast(payload: ToastPayload, callback?: () => void): void {
    Spicetify.Platform?.OSNotificationsAPI?.showToast?.(payload, callback);
  }

  static async getLogFolder(): Promise<string | null> {
    const logsApi = Spicetify.Platform?.DesktopLogsAPI;
    if (!logsApi?.getLogFolder) return null;

    try {
      return await logsApi.getLogFolder();
    } catch (error) {
      Luminous.Logger.warn(
        'Runtime',
        'Failed to get Spotify log folder',
        error,
      );
      return null;
    }
  }

  static async getVersionInfo(): Promise<VersionInfo | null> {
    const updateApi = Spicetify.Platform?.UpdateAPI;
    if (!updateApi?.getVersionInfo) return null;

    try {
      return await updateApi.getVersionInfo();
    } catch (error) {
      Luminous.Logger.warn(
        'Runtime',
        'Failed to get Spotify version info',
        error,
      );
      return null;
    }
  }
}
