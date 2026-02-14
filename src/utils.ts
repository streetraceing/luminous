export function waitForSongInfo(): Promise<void> {
    return new Promise((resolve) => {
        const check = () => {
            if (
                Spicetify.Player &&
                Spicetify.Player.data &&
                Spicetify.Player.data.item
            ) {
                resolve();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

export function waitForCanvasVideo(): Promise<HTMLVideoElement> {
    return new Promise((resolve) => {
        const check = () => {
            const video = document.querySelector(
                '.canvasVideoContainerNPV video',
            ) as HTMLVideoElement | null;

            if (video) resolve(video);
            else requestAnimationFrame(check);
        };

        check();
    });
}

export function spotifyImageToUrl(uri?: string): string | null {
    if (!uri) return null;

    if (uri.startsWith('https://')) return uri;

    if (uri.startsWith('spotify:image:')) {
        const id = uri.replace('spotify:image:', '');
        return `https://i.scdn.co/image/${id}`;
    }

    return null;
}
