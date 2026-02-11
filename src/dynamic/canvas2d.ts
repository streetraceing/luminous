import {
    RGB,
    HSL,
    rgbToHsl,
    adjustSaturation,
    adjustLightness,
    getLuminance,
    rgbToHex,
} from './color';

interface Palette {
    dominant: string;
    accent: string;
    muted: string;
    dark: string;
    light: string;
    rgb: RGB;
    hsl: HSL;
    isLight: boolean;
    contrastText: string;
}

export async function extractPalette(
    imageUrl: string,
): Promise<Palette | null> {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej();
    }).catch(() => null);

    if (!img.width) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const size = 64;
    canvas.width = size;
    canvas.height = size;

    ctx.drawImage(img, 0, 0, size, size);

    const data = ctx.getImageData(0, 0, size, size).data;

    const colorMap = new Map<string, number>();

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r < 15 && g < 15 && b < 15) continue;
        if (r > 240 && g > 240 && b > 240) continue;

        const key = `${r >> 3},${g >> 3},${b >> 3}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    if (colorMap.size === 0) return null;

    const dominantKey = [...colorMap.entries()].sort(
        (a, b) => b[1] - a[1],
    )[0][0];

    const [r, g, b] = dominantKey.split(',').map((n) => Number(n) << 3);

    const rgb = { r, g, b };
    const hsl = rgbToHsl(r, g, b);

    const dominant = rgbToHex(rgb);
    const accent = adjustSaturation(hsl, 1.2);
    const muted = adjustSaturation(hsl, 0.6);
    const dark = adjustLightness(hsl, 0.6);
    const light = adjustLightness(hsl, 1.4);

    const isLight = getLuminance(rgb) > 0.5;
    const contrastText = isLight ? '#000000' : '#ffffff';

    return {
        dominant,
        accent,
        muted,
        dark,
        light,
        rgb,
        hsl,
        isLight,
        contrastText,
    };
}
