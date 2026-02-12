import {
    ensureContrast,
    normalizeAccent,
    stabilizeHue,
} from './dynamic/adaptive';
import { extractPalette } from './dynamic/canvas2d';
import { hslToHex } from './dynamic/color';
import { applyRgbVars } from './dynamic/spotify';
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
        applyDynamic(paletteCache.get(trackUri)!);
        return;
    }

    const rawImage =
        item.album?.images?.[0]?.url ?? item.album?.images?.[0]?.url;

    const imageUrl = spotifyImageToUrl(rawImage);
    if (!imageUrl) return;

    const palette = await extractPalette(imageUrl);
    if (!palette) return;

    paletteCache.set(trackUri, palette);
    applyDynamic(palette);
}

function applyDynamic(
    palette: NonNullable<Awaited<ReturnType<typeof extractPalette>>>,
) {
    const root = document.documentElement;

    let normalized = normalizeAccent(palette.hsl);

    normalized.h = stabilizeHue(normalized.h);

    let accent = hslToHex(normalized.h, normalized.s, normalized.l);

    accent = ensureContrast(accent);

    const main = hslToHex(normalized.h, 0.15, 0.08);
    const elevated = hslToHex(normalized.h, 0.18, 0.12);
    const sidebar = hslToHex(normalized.h, 0.12, 0.05);

    root.style.setProperty('--spice-main', main);
    root.style.setProperty('--spice-main-elevated', elevated);
    root.style.setProperty('--spice-sidebar', sidebar);

    root.style.setProperty('--spice-button', accent);
    root.style.setProperty('--spice-button-active', accent);

    root.style.setProperty('--spice-text', '#ffffff');
    root.style.setProperty('--spice-subtext', 'rgba(255,255,255,0.7)');

    applyRgbVars(root, 'main', main);
    applyRgbVars(root, 'button', accent);
}

async function init() {
    await waitForTrackInfo();
    await updateAccent();

    Spicetify.Player.addEventListener('songchange', updateAccent);
}

init();
