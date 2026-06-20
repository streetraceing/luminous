import { Canvas } from "../../api/canvas";
import { Logger } from "../../api/logger";
import { Native } from "../../api/native";
import { Settings } from "../../api/settings";
import { Song } from "../../api/song";
import { Background } from "../../render/background";

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
