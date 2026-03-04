export class Display {
    static toggle(selector: string, visible: boolean, collapse?: 'x' | 'y') {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) return;

        el.classList.toggle('luminous-hidden', !visible);

        if (collapse === 'x') {
            el.classList.toggle('luminous-collapse-x', !visible);
        }

        if (collapse === 'y') {
            el.classList.toggle('luminous-collapse-y', !visible);
        }
    }
}
