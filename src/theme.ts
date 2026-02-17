import { Logger, logInitComplete, printBanner } from './tools';
import { renderCanvas, renderImage } from './render/background';
import {
    observeNowPlaying,
    observePlaylistBackgroundSync,
    waitForCanvas,
    waitForSongInfo,
} from './render/utils';

let scheduled = false;

function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
        scheduled = false;
        refreshBackgroundState();
    });
}

function getCurrentSong() {
    const song = Spicetify.Player.data?.item;
    if (!song) return undefined;

    const title = `${song.name} - ${song.artists?.map((a) => a.name).join(', ')}`;
    const image = song.images?.[0]?.url ?? song.album?.images?.[0]?.url;
    const { uri } = song;

    return {
        song,
        title,
        image,
        uri,
    };
}

async function refreshBackgroundState() {
    const data = getCurrentSong();
    if (!data) return;

    const { title, image, uri } = data;

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
        const canvas = await waitForCanvas(uri);

        const current = Spicetify.Player.data?.item;
        if (!current || current.uri !== uri) {
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

    Spicetify.Player.addEventListener('songchange', () => {
        const data = getCurrentSong();
        if (!data) return;
        Logger.info(`Song changed to ${data.title}`, 'Main');
        scheduleRefresh();
    });

    observeNowPlaying({
        onMount: () => {
            Logger.info('NowPlaying mounted', 'Main');
        },
        onUnmount: () => {
            Logger.info('NowPlaying unmounted', 'Main');
        },
        onCanvasChange: (hasCanvas) => {
            Logger.info(
                hasCanvas ? 'Canvas mode enabled' : 'Artwork mode enabled',
                'Main',
            );
            scheduleRefresh();
        },
        onPlay: () => {
            Logger.info('Playback started', 'Main');
        },
        onPause: () => {
            Logger.info('Playback paused', 'Main');
        },
    });

    observePlaylistBackgroundSync({
        onBackgroundChange: (bg) => {
            Logger.info(`Playlist header background synced: ${bg}`, 'Main');
        },
    });

    const duration = (performance.now() - start).toFixed(0);
    logInitComplete(duration);
}

init();
