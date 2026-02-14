import {
    ensureContrast,
    isMonochrome,
    normalizeAccent,
    stabilizeHue,
} from './dynamic/adaptive';
import { extractPalette } from './dynamic/canvas2d';
import { HSL, hslToHex } from './dynamic/color';
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

    if (isMonochrome(hsl)) {
        applyMonochromeTheme(root, hsl);
        return;
    }

    let normalized = normalizeAccent(hsl);
    normalized.h = stabilizeHue(normalized.h);

    const accent = ensureContrast(
        hslToHex(normalized.h, Math.min(0.9, normalized.s * 1.1), 0.52),
    );

    const main = hslToHex(normalized.h, 0.25, 0.07);
    const elevated = hslToHex(normalized.h, 0.28, 0.11);
    const sidebar = hslToHex(normalized.h, 0.22, 0.05);
    const card = hslToHex(normalized.h, 0.3, 0.14);
    const highlight = hslToHex(normalized.h, 0.35, 0.18);

    root.style.setProperty('--spice-main', main);
    root.style.setProperty('--spice-main-elevated', elevated);
    root.style.setProperty('--spice-sidebar', sidebar);
    root.style.setProperty('--spice-card', card);
    root.style.setProperty('--spice-highlight', highlight);

    root.style.setProperty('--spice-button', accent);
    root.style.setProperty('--spice-button-active', accent);
    root.style.setProperty('--spice-tab-active', accent);

    root.style.setProperty('--spice-text', '#ffffff');
    root.style.setProperty('--spice-subtext', 'rgba(255,255,255,0.7)');

    root.style.setProperty('--background-tinted-base', accent + '22');
    root.style.setProperty('--background-tinted-highlight', accent + '33');

    applyRgbVars(root, 'main', main);
    applyRgbVars(root, 'sidebar', sidebar);
    applyRgbVars(root, 'card', card);
    applyRgbVars(root, 'button', accent);
}

function applyMonochromeTheme(root: HTMLElement, hsl: HSL) {
    const isLight = hsl.l > 0.6;

    const main = '#0f0f0f';
    const elevated = '#181818';
    const sidebar = '#090909';

    const accent = isLight ? '#ffffff' : '#cccccc';

    root.style.setProperty('--spice-main', main);
    root.style.setProperty('--spice-main-elevated', elevated);
    root.style.setProperty('--spice-sidebar', sidebar);

    root.style.setProperty('--spice-button', accent);
    root.style.setProperty('--spice-button-active', accent);

    root.style.setProperty('--spice-text', '#ffffff');
    root.style.setProperty('--spice-subtext', 'rgba(255,255,255,0.6)');

    applyRgbVars(root, 'main', main);
    applyRgbVars(root, 'button', accent);
}

async function init() {
    await waitForTrackInfo();
    await updateAccent();

    Spicetify.Player.addEventListener('songchange', updateAccent);
}

init();
