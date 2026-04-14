import { Background } from "../render/background";
import { Canvas } from "./canvas";
import { Native } from "./native";
import { Song } from "./song";

export function exposeGlobalAPI() {
  Object.defineProperty(window, "Luminous", {
    value: { Background, Canvas, Song, Native, version: __APP_VERSION__ },
    configurable: true,
  });
}

declare global {
  const Luminous: {
    Background: typeof Background;
    Canvas: typeof Canvas;
    Song: typeof Song;
    version: string;
  };
}
