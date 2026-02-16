import { Logger, logInitComplete, printBanner } from './tools';
import { renderCanvas, renderImage } from './render/background';
import { observePlaylistBackgroundSync } from './render/page';
import {
    observeNowPlaying,
    waitForCanvas,
    waitForSongInfo,
} from './render/utils';

let updateScheduled = false;

function scheduleRefresh() {
    if (updateScheduled) return;
    updateScheduled = true;

    Promise.resolve().then(() => {
        updateScheduled = false;
        refreshBackgroundState();
    });
}

async function refreshBackgroundState() {
    const song = Spicetify.Player.data?.item;
    if (!song) return;

    const title = `${song.name} - ${song.artists?.map((a) => a.name).join(', ')}`;

    const image = song.images?.[0]?.url ?? song.album?.images?.[0]?.url;

    if (image) {
        renderImage(image);
        Logger.info(
            `Image background set for "${title}"`,
            'BackgroundRenderer',
        );
    } else {
        renderImage(null);
        Logger.warn(`No image found for "${title}"`, 'BackgroundRenderer');
    }

    try {
        const canvas = await waitForCanvas(song.uri);

        const current = Spicetify.Player.data?.item;
        if (!current || current.uri !== song.uri) {
            Logger.info(
                `Canvas cancelled (track changed) for "${title}"`,
                'BackgroundRenderer',
            );
            return;
        }

        renderCanvas(canvas.video, canvas.gen);

        Logger.info(
            `Background upgraded to canvas for "${title}"`,
            'BackgroundRenderer',
        );
    } catch (err) {
        Logger.warn(
            `Canvas not available for "${title}"`,
            'BackgroundRenderer',
        );
    }
}

async function init() {
    const version = '1.2.0';
    const start = performance.now();

    printBanner(version);

    Logger.info('Waiting for Spotify Player...', 'Main');

    await waitForSongInfo();

    scheduleRefresh();

    observeNowPlaying({
        onMount: () => {
            Logger.info('NowPlaying mounted', 'Main');
            scheduleRefresh();
        },
    });

    Spicetify.Player.addEventListener('songchange', () => {
        Logger.info('Song change detected', 'Main');
        scheduleRefresh();
    });

    observePlaylistBackgroundSync();

    const duration = (performance.now() - start).toFixed(0);
    logInitComplete(duration);
}

init();
