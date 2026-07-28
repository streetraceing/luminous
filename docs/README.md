# Luminous documentation

This documentation covers the everyday use and technical structure of the Luminous Spicetify theme.

## Guides

- [Customisation](./customization.md) - use the built-in settings panel and understand each option.
- [Architecture](./architecture.md) - learn how the theme detects Spotify state and renders the dynamic backdrop.
- [Troubleshooting](./troubleshooting.md) - resolve common installation and display issues.

## Quick reference

| Need                        | Where to start                          |
| --------------------------- | --------------------------------------- |
| Install or build the theme  | [Project README](./README.md#install)   |
| Change the visual effect    | [Customisation](./customization.md)     |
| Understand source modules   | [Architecture](./architecture.md)       |
| Recover from a broken apply | [Troubleshooting](./troubleshooting.md) |

Luminous is designed as a lightweight layer on top of Spotify and Spicetify: it reuses Spotify's React runtime and Canvas playback instead of bundling a separate UI or video pipeline.
