import { Settings } from './settings';
import { Background } from '../render/background';
import { Song } from './song';
import { Canvas } from './canvas';
import { Native } from './native';

export function exposeGlobalAPI() {
    Object.defineProperty(window, 'Luminous', {
        value: { Native, Settings, Background, Song, Canvas, version: __APP_VERSION__ },
        configurable: true,
    });
}
