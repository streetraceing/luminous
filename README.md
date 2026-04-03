# Luminous

Luminous is a lightweight dynamic Spicetify theme with a transparent glass-style UI and backgrounds powered by the current track’s artwork or canvas.

It automatically upgrades from image to canvas when available and keeps transitions smooth and consistent.

## Features

- Dynamic background (artwork or canvas)
- Transparent glass-like interface
- Smooth background transitions
- Reactive to track changes
- Only upgraded design without break it

## Requirements

- NodeJS 25.5.0
- NPM 11.12.0
- Spicetify 2.42.15
- Configured Spicetify CLI

## Install & Apply

```bash
npm install
npm run apply
```

## Build

```bash
npm install
npm run build
```

The theme is automatically built into:

```
C:/Users/<your_username>/AppData/Local/spicetify/Themes
```

You can customize the output path in `vite.config.ts`:

```ts
spicetifySync({
    spicetifyRoot: 'path/to/spicetify',
});
```

## Revert to default theme

```bash
npm run discard
```
