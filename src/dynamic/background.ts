export function ensureVideoBackgroundLayer(): HTMLDivElement {
    let layer = document.getElementById('luminous-video-bg') as HTMLDivElement;

    if (layer) return layer;

    layer = document.createElement('div');
    layer.id = 'luminous-video-bg';

    Object.assign(layer.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '-1',
        overflow: 'hidden',
        pointerEvents: 'none',
    });

    document.body.prepend(layer);
    return layer;
}

export function attachBlurredImage(src: string) {
    const layer = ensureVideoBackgroundLayer();
    layer.innerHTML = '';

    const img = document.createElement('img');
    img.src = src;

    Object.assign(img.style, {
        position: 'absolute',
        inset: '0',
        width: '120%',
        height: '120%',
        objectFit: 'cover',
        filter: 'blur(60px) brightness(0.6)',
        transform: 'scale(1.2)',
        pointerEvents: 'none',
    });

    layer.appendChild(img);
}

export function attachBlurredVideo(video: HTMLVideoElement) {
    const layer = ensureVideoBackgroundLayer();
    layer.innerHTML = '';

    const stream = (video as any).captureStream?.();
    if (!stream) return;

    const bgVideo = document.createElement('video');
    bgVideo.srcObject = stream;

    Object.assign(bgVideo.style, {
        position: 'absolute',
        inset: '0',
        width: '120%',
        height: '120%',
        objectFit: 'cover',
        filter: 'blur(40px) brightness(0.6)',
        transform: 'scale(1.2)',
        pointerEvents: 'none',
    });

    bgVideo.muted = true;
    bgVideo.play().catch(() => {});

    layer.appendChild(bgVideo);
}

export function waitForCanvasVideo(
    timeout = 1500,
): Promise<HTMLVideoElement | null> {
    return new Promise((resolve) => {
        const start = Date.now();

        function check() {
            const video = document.querySelector(
                '.canvasVideoContainerNPV video',
            ) as HTMLVideoElement | null;

            if (video) {
                resolve(video);
                return;
            }

            if (Date.now() - start > timeout) {
                resolve(null);
                return;
            }

            requestAnimationFrame(check);
        }

        check();
    });
}

export function setTransparentMode(enabled: boolean) {
    const selectors = [
        '.Root__now-playing-bar',
        '#global-nav-bar',
        '.Root__top-container',
    ];

    selectors.forEach((sel) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) return;

        el.style.background = enabled ? 'transparent' : '';
    });
}

export function getCurrentCoverImage(): string | null {
    const img = document.querySelector(
        '.main-nowPlayingView-coverArt.main-image-image',
    ) as HTMLImageElement | null;

    if (img?.src) return img.src;

    return null;
}
