import type { useEffect as ReactUseEffect } from "react";
import { Synchronize } from "../../ui/synchronize";
import { SyncController } from "../../types/runtime/dynamic.types";

export function SynchronizeFeature() {
  const useEffect = Spicetify.React.useEffect as typeof ReactUseEffect;

  useEffect(() => {
    const controllers: SyncController[] = [
      Synchronize.brokenUiWatcher(),
      Synchronize.observeCinema(),
      Synchronize.playlistBackground(),
      Synchronize.homeHeaderHeight(),
    ];

    return () => {
      controllers.forEach((controller) => controller.disconnect());
    };
  }, []);

  return null;
}
