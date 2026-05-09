import { CanvasPayload } from "../api/canvas";
import { SongPayload } from "../api/song";

export class DynamicBackground {
  private static currentSong: SongPayload | null = null;
  private static currentCanvas: HTMLVideoElement | null = null;

  static init() {
    Luminous.Song.addEventListener("ready", this.handleSong);
    Luminous.Song.addEventListener("change", this.handleSong);

    Luminous.Canvas.addEventListener("mount", this.handleCanvas);
    Luminous.Canvas.addEventListener("change", this.handleCanvas);
    Luminous.Canvas.addEventListener("unmount", this.handleCanvasUnmount);
  }

  static render() {
    if (Luminous.Settings.get("dynamicBackground") === false) return;

    if (this.currentCanvas && !document.hidden) {
      Luminous.Background.render({ canvas: this.currentCanvas });
      return;
    }

    if (this.currentSong?.image) {
      Luminous.Background.render({ image: this.currentSong.image });
      return;
    }

    Luminous.Background.render();
  }

  private static handleSong = (song: SongPayload) => {
    this.currentSong = song;
    this.render();
  };

  private static handleCanvas = (canvas: CanvasPayload) => {
    if (!canvas.video) return;
    if (!this.currentSong?.track.metadata["canvas.id"]) return;

    this.currentCanvas = canvas.video;
    this.render();
  };

  private static handleCanvasUnmount = () => {
    if (this.currentSong?.track.metadata["canvas.id"] !== undefined) {
      return;
    }

    this.currentCanvas = null;
    this.render();
  };
}
