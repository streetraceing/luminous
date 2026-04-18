import { cinemaModeObserver, dynamicBackground } from "./render/dynamic";
import { exposeGlobalAPI } from "./api/global";

import.meta.glob("./styles/**/*.css", { eager: true });
exposeGlobalAPI();

Luminous.Logger.printBanner();

Luminous.Settings.init();
Luminous.Song.init();
Luminous.Canvas.init();
Luminous.Background.render();

dynamicBackground();
cinemaModeObserver();
