let root: HTMLDivElement | null = null;
let blackLayer: HTMLDivElement | null = null;
let imageLayer: HTMLImageElement | null = null;
let videoLayer: HTMLVideoElement | null = null;

let currentType: 'none' | 'image' | 'canvas' = 'none';
let currentImage: string | null = null;

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
        transition: 'opacity 0.35s ease',
    });

    root.appendChild(blackLayer);

    imageLayer = document.createElement('img');
    Object.assign(imageLayer.style, baseStyle(60));
    imageLayer.style.opacity = '0';
    imageLayer.style.transition = 'opacity 0.35s ease';

    root.appendChild(imageLayer);

    createVideoLayer(root);
}

function createVideoLayer(root: HTMLElement | null) {
    root = root || document.getElementById('luminous-bg');
    if (!root) return;

    resetVideoLayer(root);

    videoLayer = document.createElement('video');
    Object.assign(videoLayer.style, baseStyle(40));
    videoLayer.id = 'luminous-videolayer';
    videoLayer.muted = true;
    videoLayer.playsInline = true;
    videoLayer.style.opacity = '0';
    videoLayer.style.transition = 'opacity 0.35s ease';

    root.appendChild(videoLayer);
}

function resetVideoLayer(root: HTMLElement | null) {
    root = root || document.getElementById('luminous-bg');
    if (!root) return;
    const videoElement = document.getElementById('luminous-videolayer');
    try {
        videoElement!.innerHTML = '';
        videoElement!.remove();
        root?.removeChild(videoLayer!.getRootNode());
    } catch {}
    videoLayer = null;
}

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
    };
}

let canvasGeneration = 0;

export function nextCanvasGeneration() {
    canvasGeneration++;
    return canvasGeneration;
}

export function getCanvasGeneration() {
    return canvasGeneration;
}

export function renderImage(src: string | null) {
    ensureBackground();
    if (!imageLayer || !blackLayer || !videoLayer) return;

    if (!src) {
        switchTo('none');
        return;
    }

    if (currentImage !== src) {
        imageLayer.src = src;
        currentImage = src;
    }

    switchTo('image');
}

export function renderCanvas(sourceVideo: HTMLVideoElement, gen: number) {
    if (gen !== getCanvasGeneration()) return;

    ensureBackground();
    createVideoLayer(null);

    if (!videoLayer) return;

    const stream = (sourceVideo as any).captureStream?.();
    if (!stream) return;

    function waitForActiveTrack() {
        if (gen !== getCanvasGeneration()) return;
        if (!videoLayer) return;

        const tracks = stream.getVideoTracks();

        if (tracks.length > 0 && tracks[0].readyState === 'live') {
            videoLayer.srcObject = stream;
            videoLayer.play().catch(() => {});
            switchTo('canvas');
            return;
        }

        requestAnimationFrame(waitForActiveTrack);
    }

    waitForActiveTrack();
}

function switchTo(type: 'none' | 'image' | 'canvas') {
    if (!blackLayer || !imageLayer || !videoLayer) return;
    if (currentType === type) return;

    currentType = type;

    blackLayer.style.opacity = type === 'none' ? '1' : '0';
    imageLayer.style.opacity = type === 'image' ? '1' : '0';
    videoLayer.style.opacity = type === 'canvas' ? '1' : '0';

    setTransparentMode(type !== 'none');
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
