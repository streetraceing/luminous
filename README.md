# Luminous

> A lightweight dynamic [Spicetify](https://spicetify.app/) theme with glass surfaces, album-art ambience, and Spotify Canvas support.

<p align="center">
  <img src="./assets/preview.png" alt="Luminous theme preview" width="900" />
</p>

<p align="center">
  <a href="https://spicetify.app/docs/customization/marketplace">Spicetify Marketplace</a>
  ·
  <a href="https://youtu.be/S-2u6xTFZCs">Video preview</a>
  ·
  <a href="./docs/README.md">Documentation</a>
</p>

Luminous transforms Spotify's default interface into a softly lit, translucent workspace. It uses the current track's artwork as a backdrop and switches to an animated Canvas stream when one is available.

<details>
  <summary><strong>Animated preview</strong></summary>
  <br />
  <img src="./assets/preview-compressed.gif" alt="Luminous animated preview" />
</details>

## Highlights

- Dynamic backgrounds from cover art, with Canvas as the preferred source.
- Adjustable background blur, brightness, and glass-surface opacity.
- A compact settings panel in Spotify's top bar.
- Graceful fallbacks when artwork, Canvas, or Spotify UI elements are unavailable.
- No runtime dependencies bundled with the theme.

## Install

The simplest option is to install **Luminous** from the [Spicetify Marketplace](https://spicetify.app/marketplace/). For local development or manual installation, use the workflow below.

### Requirements

- [Spicetify](https://spicetify.app/) 2.44.0 or later.
- Node.js 25.9.0 and npm 11.18.0 for building from source.
- Spotify desktop app with Spicetify already configured.

### Build from source

```bash
git clone https://github.com/streetraceing/luminous.git
cd luminous
npm install
npm run build
```

### Apply the local build

```bash
npm run apply
```

This builds the theme, sets `Luminous` as the current Spicetify theme, and applies it to Spotify.

### Revert to the Marketplace theme

```bash
npm run revert
```

## Development

| Command                  | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `npm run typecheck`      | Validate TypeScript without writing files. |
| `npm run build`          | Create the distributable files in `dist/`. |
| `npm run watch`          | Ask Spicetify to watch the active theme.   |
| `npm run prettier:write` | Format project files with Prettier.        |
| `npm run release`        | Build and create the release artifacts.    |

## Documentation

The [`docs/`](./docs/README.md) directory explains how the theme works, how to customise it, and how to troubleshoot an installation:

- [Using and customising Luminous](./docs/customization.md)
- [Technical architecture](./docs/architecture.md)
- [Troubleshooting](./docs/troubleshooting.md)

## License

Distributed under the [MIT License](./LICENSE).
