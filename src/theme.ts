console.log('Luminous theme loaded ✨');

function onSongChange(): void {
    document.body.classList.add('luminous-active');
}

Spicetify.Player.addEventListener('songchange', onSongChange);
