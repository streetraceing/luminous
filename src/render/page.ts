export function observePlaylistBackgroundSync() {
    const root = document.querySelector('.main-view-container');
    if (!root) return;

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

        if (target.style.backgroundImage !== bg) {
            target.style.backgroundImage = bg;
            target.style.backgroundSize = 'cover';
            target.style.backgroundPosition = 'center';
            target.style.backgroundRepeat = 'no-repeat';
        }
    }

    const observer = new MutationObserver(() => {
        sync();
    });

    observer.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
    });

    sync();
}
