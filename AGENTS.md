# Luminous contributor rules

These rules apply to all work in this repository.

1. Update the relevant documentation whenever a change materially affects architecture, runtime behavior, settings, performance characteristics, development workflow, or user-facing functionality.
2. Preserve the visual style and overall structure of the root `README.md`. Only update its factual information when necessary; do not redesign, reformat, or reorganize it unless the user explicitly asks for that.
3. Never change the project version manually. Never run, edit, invoke, create, or replace `vite/releaseScript.ts`, `npm run release`, version-bump scripts, or equivalent release/version automation.
4. After completing a set of changes, end the reply with a brief commit-style message on its own line, formatted as `<type>: <summary>` where `<type>` is one of `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, or `build` (for example: `fix: handle missing artwork without clearing the background`). The message is report-only for the operator to reuse as a git commit subject; never create git commits unless the user explicitly asks for that.
