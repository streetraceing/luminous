import { Logger } from './logger';
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
    console.log(
        '%c Luminous %c dynamic Spotify background engine ',
        'background:#1DB954;color:#000;padding:4px 10px;border-radius:6px 0 0 6px;font-weight:bold;',
        'background:#121212;color:#1DB954;padding:4px 10px;border-radius:0 6px 6px 0;',
    );

    const start = performance.now();

    Logger.info('Waiting for Spotify Player...', 'Main');

    await waitForSongInfo();

    Logger.info('Player detected', 'Main');

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

    Logger.info(`Luminous initialized in ${duration}ms ✨`, 'Main');
}

init();
