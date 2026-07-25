import { useEffect } from '../react';
import { Synchronize } from '../../ui/synchronize';
import { SyncController } from '../../types/runtime/dynamic.types';

export function SynchronizeFeature() {
  const effect = useEffect();

  effect(() => {
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
