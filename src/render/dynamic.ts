import { CanvasPayload } from "../api/canvas";
import { SongPayload } from "../api/song";

export function dynamicBackground() {
  let currentSong: SongPayload | null = null;
  let currentCanvas: HTMLVideoElement | null = null;

  function render() {
    if (currentCanvas && !document.hidden) {
      Luminous.Background.render({ canvas: currentCanvas });
      return;
    }

    if (currentSong?.image) {
      Luminous.Background.render({ image: currentSong.image });
      return;
    }

    Luminous.Background.render();
  }

  function handleSong(song: SongPayload) {
    currentSong = song;

    render();
  }

  function handleCanvas(canvas: CanvasPayload) {
    if (!canvas.video) return;

    currentCanvas = canvas.video;

    render();
  }

  function handleCanvasUnmount() {
    currentCanvas = null;
    render();
  }

  Luminous.Song.addEventListener("ready", handleSong);
  Luminous.Song.addEventListener("change", handleSong);

  Luminous.Canvas.addEventListener("mount", handleCanvas);
  Luminous.Canvas.addEventListener("change", handleCanvas);
  Luminous.Canvas.addEventListener("unmount", handleCanvasUnmount);
}

export function cinemaModeObserver() {
  const html = document.documentElement;

  new MutationObserver(() => {
    html.removeAttribute("data-transition");

    [
      "data-right-sidebar-open-preenter",
      // "data-right-sidebar-open-duringenter",
      // "data-right-sidebar-open-postenter",
      "data-right-sidebar-open-preexit",
      "data-right-sidebar-open-duringexit",
      "data-right-sidebar-open-postexit",
    ].forEach((attr) => html.removeAttribute(attr));
  }).observe(html, { attributes: true });
}
