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
    const start = performance.now();

    printBanner();
    Logger.info('Waiting for Spotify Player...', 'Main');

    await waitForSongInfo();
    scheduleRefresh();

    observeNowPlaying({
        onMount: () => {
            Logger.info('NowPlaying canvas mounted', 'Main');
            scheduleRefresh();
        },
        onUnmount: () => Logger.info('NowPlaying canvas unmounted', 'Main'),
        onPlay: () => {
            Logger.info('NowPlaying canvas playback started', 'Main');
            scheduleRefresh();
        },
        onPause: () => Logger.info('NowPlaying canvas playback paused', 'Main'),
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
