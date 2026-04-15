import { CanvasPayload } from "./canvas";
import { SongPayload } from "./song";

export function dynamicBackground() {
  let currentSong: SongPayload | null = null;
  let wantCanvas = false;

  function handleSong(song: SongPayload) {
    currentSong = song;
    wantCanvas = song.track.metadata["canvas.id"] !== undefined;

    if (!wantCanvas) {
      Luminous.Background.render({ image: song.image });
      return;
    }
  }

  function handleCanvas(canvas: CanvasPayload) {
    if (!wantCanvas || !canvas.video) return;

    Luminous.Background.render({ canvas: canvas.video });
  }

  Luminous.Song.addEventListener("ready", handleSong);
  Luminous.Song.addEventListener("change", handleSong);

  Luminous.Canvas.addEventListener("mount", handleCanvas);
  Luminous.Canvas.addEventListener("change", handleCanvas);

  Luminous.Canvas.addEventListener("unmount", () => {
    if (!currentSong) return;

    Luminous.Background.render({ image: currentSong.image });
  });
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
