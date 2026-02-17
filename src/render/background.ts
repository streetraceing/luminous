let root: HTMLDivElement | null = null;
let blackLayer: HTMLDivElement | null = null;

let imageLayers: [HTMLImageElement, HTMLImageElement] | null = null;
let activeImage = 0;

let videoLayer: HTMLVideoElement | null = null;
let currentType: 'none' | 'image' | 'canvas' = 'none';

function baseStyle(blur: number) {
    return {
        position: 'absolute',
        inset: '0',
        width: '120%',
        height: '120%',
        objectFit: 'cover',
        filter: `blur(${blur}px) brightness(0.9)`,
        transform: 'scale(1.2)',
        pointerEvents: 'none',
        transition: 'opacity 0.25s ease',
    };
}

function createImageLayer(): HTMLImageElement {
    const img = document.createElement('img');
    Object.assign(img.style, baseStyle(40));
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.25s ease';
    return img;
}

function createVideoLayer(root: HTMLElement | null) {
    root = root || document.getElementById('luminous-bg');
    if (!root) return;

    videoLayer = document.createElement('video');
    Object.assign(videoLayer.style, baseStyle(40));
    videoLayer.id = 'luminous-videolayer';
    videoLayer.muted = true;
    videoLayer.playsInline = true;
    videoLayer.style.opacity = '0';
    videoLayer.style.transition = 'opacity 0.25s ease';

    root.appendChild(videoLayer);
}

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

    blackLayer = document.createElement('div');
    Object.assign(blackLayer.style, {
        position: 'absolute',
        inset: '0',
        background: '#000',
        transition: 'opacity 0.25s ease',
    });

    root.appendChild(blackLayer);

    const imgA = createImageLayer();
    const imgB = createImageLayer();

    root.appendChild(imgA);
    root.appendChild(imgB);

    imageLayers = [imgA, imgB];

    createVideoLayer(root);
}

function setTransparentMode(enabled: boolean) {
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

export function renderImage(src: string | null) {
    ensureBackground();
    if (!imageLayers || !blackLayer) return;

    if (!src) {
        switchTo('none');
        return;
    }

    const nextIndex = activeImage === 0 ? 1 : 0;
    const currentLayer = imageLayers[activeImage];
    const nextLayer = imageLayers[nextIndex];

    if (currentLayer.src === src) {
        currentLayer.style.opacity = '1';
        imageLayers[activeImage === 0 ? 1 : 0].style.opacity = '0';
        switchTo('image');
        return;
    }

    const img = new Image();
    img.src = src;

    img.onload = () => {
        nextLayer.src = src;
        nextLayer.style.opacity = '1';
        currentLayer.style.opacity = '0';

        activeImage = nextIndex;
    };

    switchTo('image');
}

export function renderCanvas(sourceVideo: HTMLVideoElement, gen: number) {
    ensureBackground();
    if (!videoLayer) return;

    const stream = (sourceVideo as any).captureStream?.();
    if (!stream) return;

    videoLayer.srcObject = stream;
    videoLayer.play().catch(() => {});

    switchTo('canvas');
}

export function switchTo(type: 'none' | 'image' | 'canvas') {
    if (!blackLayer || !imageLayers || !videoLayer) return;
    if (currentType === type) return;

    currentType = type;

    blackLayer.style.opacity = type === 'none' ? '1' : '0';
    videoLayer.style.opacity = type === 'canvas' ? '1' : '0';

    if (type !== 'image') {
        imageLayers[0].style.opacity = '0';
        imageLayers[1].style.opacity = '0';
    }

    setTransparentMode(type !== 'none');
}
