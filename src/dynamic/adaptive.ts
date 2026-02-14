import { getLuminance, hexToRgb, HSL, hslToHex, rgbToHsl } from './color';

export function normalizeAccent(hsl: HSL): HSL {
    let { h, s, l } = hsl;

    if (s < 0.35) s = 0.35;
    if (s > 0.85) s = 0.85;
    if (l < 0.35) l = 0.45;
    if (l > 0.65) l = 0.55;

    return { h, s, l };
}

export function stabilizeHue(h: number): number {
    if (h < 0) h += 1;
    if (h > 1) h -= 1;

    const deg = h * 360;

    if (deg >= 200 && deg <= 240) {
        return 260 / 360;
    }
    if (deg >= 280 && deg <= 310) {
        return 290 / 360;
    }
    if (deg >= 350 || deg <= 20) {
        return 0;
    }

    return h;
}

export function ensureContrast(hex: string): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const lum = getLuminance(rgb);

    let { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

    if (lum > 0.65) {
        l = 0.45;
    } else if (lum < 0.25) {
        l = 0.55;
    }

    return hslToHex(h, s, l);
}

export function isMonochrome(hsl: HSL): boolean {
    return hsl.s < 0.22;
}
