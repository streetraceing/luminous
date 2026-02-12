import { hexToRgb } from './color';

export function applyRgbVars(root: HTMLElement, name: string, hex: string) {
    const rgb = hexToRgb(hex);

    root.style.setProperty(
        `--spice-rgb-${name}`,
        `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    );
}
