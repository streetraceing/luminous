import {
  DynamicBackground,
  CinemaObserver,
  Synchronize,
} from "./render/dynamic";
import { exposeGlobalAPI } from "./api/global";

import.meta.glob("./styles/**/*.css", { eager: true });
exposeGlobalAPI();

Luminous.Logger.printBanner();

Luminous.Settings.init();
Luminous.Song.init();
Luminous.Canvas.init();
Luminous.Background.render();

DynamicBackground.init();
CinemaObserver.init();
Synchronize.playlistBackground();

Luminous.Settings.register("dynamicBackground", {
  default: true,
  apply: (value) => {
    Luminous.Settings.toggleClass("hideDynamicBackground", !value);
    if (value) {
      Luminous.Settings.setVar("--luminous-background", "transparent");

      Luminous.Settings.setVar("--luminous-ui-base", "var(--spice-sidebar)");
      Luminous.Settings.setVar("--luminous-ui-opacity", "50%");

      DynamicBackground.render();
    } else {
      Luminous.Settings.removeVar("--luminous-background");

      Luminous.Settings.removeVar("--luminous-ui-base");
      Luminous.Settings.removeVar("--luminous-ui-opacity");
    }
  },
});
