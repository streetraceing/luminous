import { Canvas } from "../../src/api/canvas";
import { Logger } from "../../src/api/logger";
import { Native } from "../../src/api/native";
import { Settings } from "../../src/api/settings";
import { Song } from "../../src/api/song";
import { Background } from "../../src/render/background";

declare global {
  const Luminous: Readonly<{
    Background: typeof Background;
    Canvas: typeof Canvas;
    Song: typeof Song;
    Native: typeof Native;
    Settings: typeof Settings;
    Logger: typeof Logger;
    version: string;
  }>;
}
