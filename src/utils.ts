export function waitForTrackInfo(): Promise<void> {
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

export function spotifyImageToUrl(uri?: string): string | null {
    if (!uri) return null;

    if (uri.startsWith('https://')) return uri;

    if (uri.startsWith('spotify:image:')) {
        const id = uri.replace('spotify:image:', '');
        return `https://i.scdn.co/image/${id}`;
    }

    return null;
}
