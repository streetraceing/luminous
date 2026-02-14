export function getOrCreateLayer(): HTMLDivElement {
    let layer = document.getElementById('luminous-video-bg') as HTMLDivElement;

    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'luminous-video-bg';

        Object.assign(layer.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '0',
            overflow: 'hidden',
            pointerEvents: 'none',
        });

        document.body.prepend(layer);
    }

    return layer;
}

export type BackgroundType =
    | { type: 'video'; video: HTMLVideoElement }
    | { type: 'image'; src: string }
    | { type: 'none' };

export function renderBackground(config: BackgroundType) {
    clearLayer();

    if (config.type === 'none') {
        setTransparentMode(false);
        return;
    }

    const layer = getOrCreateLayer();
    setTransparentMode(true);

    if (config.type === 'image') {
        const img = document.createElement('img');
        img.src = config.src;

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
        return;
    }

    if (config.type === 'video') {
        const stream = (config.video as any).captureStream?.();
        if (!stream) {
            setTransparentMode(false);
            clearLayer();
            return;
        }

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
}

export function clearLayer() {
    const layer = document.getElementById('luminous-video-bg');
    if (layer) layer.innerHTML = '';
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
