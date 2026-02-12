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
    const { hsl } = palette;

    const main = hslToHex(hsl.h, 0.15, 0.08);
    const mainElevated = hslToHex(hsl.h, 0.18, 0.12);
    const sidebar = hslToHex(hsl.h, 0.12, 0.05);
    const card = hslToHex(hsl.h, 0.2, 0.15);
    const highlight = hslToHex(hsl.h, 0.25, 0.18);

    const button = palette.accent;
    const buttonActive = hslToHex(hsl.h, Math.min(1, hsl.s * 1.2), 0.45);

    root.style.setProperty('--spice-main', main);
    root.style.setProperty('--spice-main-elevated', mainElevated);
    root.style.setProperty('--spice-sidebar', sidebar);
    root.style.setProperty('--spice-card', card);
    root.style.setProperty('--spice-highlight', highlight);

    root.style.setProperty('--spice-button', button);
    root.style.setProperty('--spice-button-active', buttonActive);

    root.style.setProperty('--spice-text', palette.contrastText);
    root.style.setProperty('--spice-subtext', 'rgba(255,255,255,0.7)');

    applyRgbVars(root, 'main', main);
    applyRgbVars(root, 'button', button);
}

async function init() {
    await waitForTrackInfo();
    await updateAccent();

    Spicetify.Player.addEventListener('songchange', updateAccent);
}

init();
