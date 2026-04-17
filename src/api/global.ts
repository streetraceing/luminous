import { Background } from "../render/background";
import { Canvas } from "./canvas";
import { Logger } from "./logger";
import { Native } from "./native";
import { Settings } from "./settings";
import { Song } from "./song";

export function exposeGlobalAPI() {
  Object.defineProperty(window, "Luminous", {
    value: {
      Background,
      Canvas,
      Song,
      Native,
      Settings,
      Logger,
      version: __APP_VERSION__,
    },
    configurable: true,
  });
}

declare global {
  const Luminous: {
    Background: typeof Background;
    Canvas: typeof Canvas;
    Song: typeof Song;
    Native: typeof Native;
    Settings: typeof Settings;
    Logger: typeof Logger;
    version: string;
  };
}
