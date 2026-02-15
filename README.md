# Luminous

Spicetify better glass-ui dynamic theme that uses song picture or canvas for background.

## Build and run

### Requirements

- NodeJS v25.5.0
- NPM 11.10.0
- Spicetify 2.42.10 and the configured Spicetify CLI

### To use the theme, launch in the terminal

```
npm install
npm apply
```

### To build the theme, run in the terminal

```
npm install
npm run build
```

The theme automaticly build in spicetify root directory `C:/Users/<your_username>/AppData/Local/spicetify/Themes` or you can setup this manually in `vite.config.ts`:

```ts
plugins: [
    spicetifySync({
        ...
        spicetifyRoot: 'path/to/spicetify'
    }),
],
```
