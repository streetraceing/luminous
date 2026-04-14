import { CanvasPayload } from "./api/canvas";
import { exposeGlobalAPI } from "./api/global";
import { SongPayload } from "./api/song";

import.meta.glob("./styles/**/*.css", { eager: true });
exposeGlobalAPI();

console.info("Luminous theme", __APP_VERSION__);
console.info("Build time:", __BUILD_TIME__);

Luminous.Song.init();
Luminous.Canvas.init();
Luminous.Background.render();

let currentSong: SongPayload | null = null;
let currentCanvas: CanvasPayload | null = null;

function syncBackground() {
  if (currentCanvas?.video) {
    Luminous.Background.render({ canvas: currentCanvas.video });
    return;
  }

  if (currentSong?.image) {
    Luminous.Background.render({ image: currentSong.image });
    return;
  }

  Luminous.Background.render();
}

Luminous.Song.addEventListener("ready", (song) => {
  currentSong = song;
  syncBackground();
});

Luminous.Song.addEventListener("change", (song) => {
  currentSong = song;
  syncBackground();
});

Luminous.Canvas.addEventListener("mount", (canvas) => {
  currentCanvas = canvas;
  syncBackground();
});

Luminous.Canvas.addEventListener("change", (canvas) => {
  currentCanvas = canvas;
  syncBackground();
});

Luminous.Canvas.addEventListener("unmount", () => {
  currentCanvas = null;
  syncBackground();
});
