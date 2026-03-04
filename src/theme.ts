import { Canvas } from './api/canvas';
import { Display } from './api/display';
import { exposeGlobalAPI } from './api/global';
import { Native } from './api/native';
import { Settings } from './api/settings';
import { Song } from './api/song';
import { Synchronize } from './api/synchronize';
import { Unstable } from './api/unstable';
import { Background } from './render/background';

function registerSettings() {
    Settings.register('display.cinemaMode', {
        default: false,
        apply(value) {
            Display.toggle('.Root__main-view', !value);
            Display.toggle('.Root__nav-bar', !value, 'x');
            Display.toggle('.Root__right-sidebar', !value, 'x');
            Display.toggle('.Root__globalNav', !value, 'y');

            Settings.toggleClass('luminous-cinema-mode', !!value);

            Native.setWindowButtonsVisible(!value);
        },
    });
}

function registerEvents() {
    Song.addEventListener('ready', (song) => {
        Background.renderImage(song.image);
    });

    Song.addEventListener('change', (song) => {
        Background.renderImage(song.image);
    });

    Canvas.addEventListener('mount', (canvas) => {
        const song = Song.getSync();
        if (!song || !canvas.video) return;

        Background.renderCanvas(canvas.video);
    });

    Canvas.addEventListener('unmount', () => {
        const song = Song.getSync();
        if (!song) return;

        if (Background.getType() !== 'canvas') return;

        Background.renderImage(song.image);
    });
}

function main() {
    Settings.init();
    registerSettings();

    Synchronize.playlistBackground();

    registerEvents();
}

exposeGlobalAPI();

Unstable.Events.webpackLoaded.on(main);
