import { Unstable } from './unstable';

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
        return !!Unstable.Platform?.NativeAPI;
    }

    static canFocus(): boolean {
        return (
            Unstable.Platform?.FocusMainWindowAPI?.canFocusMainWindow?.() ??
            false
        );
    }

    static focus(): void {
        if (!this.canFocus()) return;
        Unstable.Platform.FocusMainWindowAPI.focusMainWindow();
    }

    static getZoomCapabilities() {
        return (
            Unstable.Platform?.ZoomAPI?.getCapabilities?.() ?? {
                canGetZoomLevel: false,
                canSetZoomLevel: false,
                canZoomIn: false,
                canZoomOut: false,
            }
        );
    }

    static async getZoomLevel(): Promise<number | null> {
        try {
            return await Unstable.Platform.ZoomAPI.getZoomLevel();
        } catch {
            return null;
        }
    }

    static async setZoomLevel(level: number) {
        const caps = this.getZoomCapabilities();
        if (!caps.canSetZoomLevel) return;

        await Unstable.Platform.ZoomAPI.setZoomLevel(level);
    }

    static zoomIn() {
        if (!this.getZoomCapabilities().canZoomIn) return;
        Unstable.Platform.ZoomAPI.zoomIn();
    }

    static zoomOut() {
        if (!this.getZoomCapabilities().canZoomOut) return;
        Unstable.Platform.ZoomAPI.zoomOut();
    }

    static setWindowButtonsVisible(visible: boolean) {
        Unstable.Platform?.NativeAPI?.setWindowButtonsVisibility?.(visible);
    }

    static restart() {
        Unstable.Platform?.LifecycleAPI?.restart?.();
    }

    static shutdown() {
        Unstable.Platform?.LifecycleAPI?.shutdown?.();
    }

    static openNotificationSettings() {
        Unstable.Platform?.OSNotificationsAPI?.openNotificationsSetting?.();
    }

    static showToast(payload: ToastPayload, callback?: () => void) {
        Unstable.Platform?.OSNotificationsAPI?.showToast?.(payload, callback);
    }

    static async getLogFolder(): Promise<string | null> {
        try {
            return await Unstable.Platform.DesktopLogsAPI.getLogFolder();
        } catch {
            return null;
        }
    }

    static async getVersionInfo(): Promise<VersionInfo | null> {
        try {
            return await Unstable.Platform.UpdateAPI.getVersionInfo();
        } catch {
            return null;
        }
    }
}
