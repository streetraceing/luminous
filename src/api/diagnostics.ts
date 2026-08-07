import { getUiHealth } from '../ui/health';

export type LuminousDiagnostics = {
  luminous: {
    version: string;
    buildTime: string;
  };
  runtime: {
    background: string;
    canvasMode: string | null;
    canvasSource: string | null;
    track: string | null;
    uiHealth: string;
    documentHidden: boolean;
  };
  settings: Record<string, string | number | boolean>;
  environment: {
    platform: string;
    language: string;
  };
};

export class Diagnostics {
  static get(): LuminousDiagnostics {
    const canvas = Luminous.Canvas.get();
    const song = Luminous.Song.getSync();

    return {
      luminous: {
        version: __APP_VERSION__,
        buildTime: __BUILD_TIME__,
      },
      runtime: {
        background: Luminous.Background.getType(),
        canvasMode: canvas.mode,
        canvasSource: canvas.source,
        track: song?.title ?? null,
        uiHealth: getUiHealth().status,
        documentHidden: document.hidden,
      },
      settings: Luminous.Settings.snapshot(),
      environment: {
        platform: navigator.platform,
        language: navigator.language,
      },
    };
  }

  static toText(): string {
    return JSON.stringify(this.get(), null, 2);
  }

  static async copy(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(this.toText());
      return true;
    } catch (error) {
      Luminous.Logger.warn('Runtime', 'Failed to copy diagnostics', error);
      return false;
    }
  }
}
