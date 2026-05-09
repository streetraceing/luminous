import { DynamicBackground } from "./ui/dynamic";
import { Synchronize } from "./ui/synchronize";
import { exposeGlobalAPI } from "./api/global";

import.meta.glob("./styles/**/*.css", { eager: true });
exposeGlobalAPI();

Synchronize.brokenUiWatcher();

Luminous.Logger.printBanner();

Luminous.Settings.init();
Luminous.Song.init();
Luminous.Canvas.init();
Luminous.Background.render();

DynamicBackground.init();

Synchronize.observeCinema();
Synchronize.playlistBackground();
Synchronize.homeHeaderHeight();

Luminous.Settings.register("dynamicBackground", {
  default: true,
  apply: (statement) => {
    Luminous.Settings.toggleClass("hideDynamicBackground", !statement);
    if (statement) {
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
