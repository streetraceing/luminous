let root: HTMLDivElement | null = null;
let blackLayer: HTMLDivElement | null = null;
let imageLayer: HTMLImageElement | null = null;
let videoLayer: HTMLVideoElement | null = null;

let currentType: 'none' | 'image' | 'video' = 'none';
let currentImageSrc: string | null = null;
let currentStream: MediaStream | null = null;

function ensureBackground() {
    if (root) return;

    root = document.createElement('div');
    root.id = 'luminous-bg';

    Object.assign(root.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '0',
        overflow: 'hidden',
        pointerEvents: 'none',
    });

    document.body.prepend(root);

    // ---- BLACK ----
    blackLayer = document.createElement('div');
    Object.assign(blackLayer.style, {
        position: 'absolute',
        inset: '0',
        background: '#000',
        transition: 'opacity 0.4s ease',
    });

    root.appendChild(blackLayer);

    // ---- IMAGE ----
    imageLayer = document.createElement('img');
    Object.assign(imageLayer.style, baseStyle(60));
    imageLayer.style.opacity = '0';
    imageLayer.style.transition = 'opacity 0.4s ease';

    root.appendChild(imageLayer);

    // ---- VIDEO ----
    videoLayer = document.createElement('video');
    Object.assign(videoLayer.style, baseStyle(40));
    videoLayer.muted = true;
    videoLayer.playsInline = true;
    videoLayer.style.opacity = '0';
    videoLayer.style.transition = 'opacity 0.4s ease';

    root.appendChild(videoLayer);
}

function baseStyle(blur: number) {
    return {
        position: 'absolute',
        inset: '0',
        width: '120%',
        height: '120%',
        objectFit: 'cover',
        filter: `blur(${blur}px) brightness(0.6)`,
        transform: 'scale(1.2)',
        pointerEvents: 'none',
    };
}

export type BackgroundType =
    | { type: 'video'; video: HTMLVideoElement }
    | { type: 'image'; src: string }
    | { type: 'none' };

export function renderBackground(config: BackgroundType) {
    ensureBackground();
    if (!blackLayer || !imageLayer || !videoLayer) return;

    if (config.type === 'none') {
        switchTo('none');
        return;
    }

    if (config.type === 'image') {
        if (currentImageSrc !== config.src) {
            imageLayer.src = config.src;
            currentImageSrc = config.src;
        }

        switchTo('image');
        return;
    }

    if (config.type === 'video') {
        const stream = (config.video as any).captureStream?.();
        if (!stream) return;

        if (currentStream !== stream) {
            videoLayer.srcObject = stream;
            videoLayer.play().catch(() => {});
            currentStream = stream;
        }

        switchTo('video');
    }
}

function switchTo(type: 'none' | 'image' | 'video') {
    if (!blackLayer || !imageLayer || !videoLayer) return;
    if (currentType === type) return;

    currentType = type;

    blackLayer.style.opacity = type === 'none' ? '1' : '0';
    imageLayer.style.opacity = type === 'image' ? '1' : '0';
    videoLayer.style.opacity = type === 'video' ? '1' : '0';

    setTransparentMode(type !== 'none');
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
