import { destroyExistingRuntime, exposeGlobalAPI } from './api/global';
import {
  destroyLuminousRuntime,
  markLuminousRuntimeActive,
} from './app/lifecycle';
import { mountLuminousApp } from './app/runtime';
import { registerLuminousSettings } from './config/settings';

import.meta.glob('./styles/**/*.css', { eager: true });

destroyExistingRuntime();
exposeGlobalAPI(destroyLuminousRuntime);
markLuminousRuntimeActive();

Luminous.Logger.printBanner();
registerLuminousSettings();
Luminous.Settings.init();

void Luminous.Song.init().catch((error) => {
  Luminous.Logger.error('Song', 'Initialization failed', error);
});

mountLuminousApp();
