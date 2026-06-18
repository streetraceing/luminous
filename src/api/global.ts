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
