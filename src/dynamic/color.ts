export type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number };

export function hexToRgb(hex: string): RGB {
    hex = hex.replace('#', '').trim();

    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((c) => c + c)
            .join('');
    }

    if (hex.length !== 6) {
        throw new Error(`Invalid hex color: ${hex}`);
    }

    const num = parseInt(hex, 16);

    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
    };
}

export function rgbToHex({ r, g, b }: RGB): string {
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    let h = 0;
    let s = 0;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }

        h /= 6;
    }

    return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
}

export function hslToHex(h: number, s: number, l: number) {
    const rgb = hslToRgb(h, s, l);
    return rgbToHex(rgb);
}

export function adjustSaturation(hsl: HSL, factor: number): string {
    const s = Math.min(1, hsl.s * factor);
    return rgbToHex(hslToRgb(hsl.h, s, hsl.l));
}

export function adjustLightness(hsl: HSL, factor: number): string {
    const l = Math.min(1, hsl.l * factor);
    return rgbToHex(hslToRgb(hsl.h, hsl.s, l));
}

export function getLuminance({ r, g, b }: RGB): number {
    const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
