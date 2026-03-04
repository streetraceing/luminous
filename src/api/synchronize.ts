type PlaylistBackgroundSyncOptions = {
    onBackgroundChange?: (
        bg: string,
        source: HTMLElement,
        target: HTMLElement,
    ) => void;
};

type SyncController = {
    disconnect(): void;
};

export class Synchronize {
    static playlistBackground(
        options?: PlaylistBackgroundSyncOptions,
    ): SyncController {
        let root: HTMLElement | null = null;
        let observer: MutationObserver | null = null;
        let rafId: number | null = null;
        let lastBg: string | null = null;
        let lastTarget: HTMLElement | null = null;

        function scheduleSync() {
            if (rafId !== null) return;

            rafId = requestAnimationFrame(() => {
                rafId = null;
                sync();
            });
        }

        function sync() {
            if (!root) return;

            const source = root.querySelector(
                '.before-scroll-node > div > :first-child',
            ) as HTMLElement | null;

            const target = root.querySelector(
                'section > .main-entityHeader-container, section > div > .main-entityHeader-container',
            ) as HTMLElement | null;

            if (!source || !target) return;

            const bg = getComputedStyle(source).backgroundImage;
            if (!bg || bg === 'none') return;

            const sameBg = bg === lastBg;
            const sameTarget = target === lastTarget;

            if (sameBg && sameTarget) return;

            lastBg = bg;
            lastTarget = target;

            target.style.backgroundImage = bg;
            target.style.backgroundSize = 'cover';
            target.style.backgroundPosition = 'center';
            target.style.backgroundRepeat = 'no-repeat';

            options?.onBackgroundChange?.(bg, source, target);
        }

        function attach() {
            root = document.querySelector(
                '.main-view-container',
            ) as HTMLElement | null;

            if (!root) {
                requestAnimationFrame(attach);
                return;
            }

            observer = new MutationObserver(scheduleSync);

            observer.observe(root, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ['style', 'class'],
            });

            sync();
        }

        attach();

        return {
            disconnect() {
                observer?.disconnect();
                observer = null;

                if (rafId !== null) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }

                root = null;
                lastBg = null;
                lastTarget = null;
            },
        };
    }
}
