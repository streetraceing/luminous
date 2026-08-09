import { useEffect } from '../react';
import { Synchronize } from '../../ui/synchronize';
import { SyncController } from '../../types/runtime/dynamic.types';

export function SynchronizeFeature() {
  const effect = useEffect();

  effect(() => {
    const controllers: SyncController[] = [
      Synchronize.uiMountWatcher(),
      Synchronize.observeCinema(),
      Synchronize.mainViewState(),
      Synchronize.leftSidebarState(),
      Synchronize.playlistBackground(),
      Synchronize.homeHeaderHeight(),
    ];

    return () => {
      controllers.forEach((controller) => controller.disconnect());
    };
  }, []);

  return null;
}
