import { extractPalette } from './dynamic/canvas2d';
import { spotifyImageToUrl, waitForTrackInfo } from './utils';

const paletteCache = new Map<
    string,
    Awaited<ReturnType<typeof extractPalette>>
>();

async function updateAccent() {
    const item = Spicetify.Player.data?.item;
    if (!item) return;

    const trackUri = item.uri;
    if (!trackUri) return;

    if (paletteCache.has(trackUri)) {
        applyPalette(paletteCache.get(trackUri)!);
        return;
    }

    const rawImage =
        item.album?.images?.[0]?.url ?? item.album?.images?.[0]?.url;

    const imageUrl = spotifyImageToUrl(rawImage);
    if (!imageUrl) return;

    const palette = await extractPalette(imageUrl);
    if (!palette) return;

    paletteCache.set(trackUri, palette);
    applyPalette(palette);
}

function applyPalette(
    palette: NonNullable<Awaited<ReturnType<typeof extractPalette>>>,
) {
    const root = document.documentElement;

    root.style.setProperty('--luminous-dominant', palette.dominant);
    root.style.setProperty('--luminous-accent', palette.accent);
    root.style.setProperty('--luminous-muted', palette.muted);
    root.style.setProperty('--luminous-dark', palette.dark);
    root.style.setProperty('--luminous-light', palette.light);
    root.style.setProperty('--luminous-contrast', palette.contrastText);
}

async function init() {
    await waitForTrackInfo();
    await updateAccent();

    Spicetify.Player.addEventListener('songchange', updateAccent);
}

init();
