import { cinemaModeObserver, dynamicBackground } from "./api/dynamic";
import { exposeGlobalAPI } from "./api/global";

import.meta.glob("./styles/**/*.css", { eager: true });
exposeGlobalAPI();

console.info("Luminous theme", __APP_VERSION__);
console.info("Build time:", __BUILD_TIME__);

Luminous.Song.init();
Luminous.Canvas.init();
Luminous.Background.render();

dynamicBackground();
cinemaModeObserver();
