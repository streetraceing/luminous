import { CanvasPayload } from "../types/runtime/canvas.types";
import { SongPayload } from "../types/runtime/song.types";

export class DynamicBackground {
  private static currentSong: SongPayload | null = null;
  private static currentCanvas: HTMLVideoElement | null = null;

  private static lastRenderKey: string | null = null;

  static init() {
    Luminous.Song.addEventListener("ready", this.handleSong);
    Luminous.Song.addEventListener("change", this.handleSong);

    Luminous.Canvas.addEventListener("mount", this.handleCanvas);
    Luminous.Canvas.addEventListener("change", this.handleCanvas);
    Luminous.Canvas.addEventListener("unmount", this.handleCanvasUnmount);
  }

  static render() {
    if (Luminous.Settings.get("dynamicBackground") === false) {
      return;
    }

    let key = "empty";

    if (this.currentCanvas) {
      key = `canvas:${this.currentCanvas.currentSrc}`;
    } else if (this.currentSong?.image) {
      key = `image:${this.currentSong.image}`;
    }

    if (key === this.lastRenderKey) {
      return;
    }

    this.lastRenderKey = key;

    const canvas = Luminous.Canvas.getVideo();

    // canvas always has priority
    if (canvas) {
      Luminous.Background.render({ canvas });
      return;
    }

    // fallback to image
    if (this.currentSong?.image) {
      Luminous.Background.render({
        image: this.currentSong.image,
      });

      return;
    }

    Luminous.Background.render();
  }

  private static handleSong = (song: SongPayload) => {
    this.currentSong = song;
    Luminous.Background.preloadImage(song.image);
    this.render();
  };

  private static handleCanvas = (canvas: CanvasPayload) => {
    this.currentCanvas = canvas.video;
    this.render();
  };

  private static handleCanvasUnmount = () => {
    this.currentCanvas = null;
    this.render();
  };
}
